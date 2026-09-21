import SparkMD5 from 'spark-md5';
import { sha256 } from 'js-sha256';

export interface HashManifestResult {
  id: string;
  name: string;
  relativePath: string;
  sizeBytes: number;
  mimeType: string;
  lastModified: number;
  sha256: string;
  md5: string;
  hashingStatus: 'completed' | 'error';
  hashProgressPercent: number;
  verificationStatus: 'unverified';
  errorMessage?: string;
}

// Strictly controlled 2MB streaming chunks to prevent memory spikes / OOM crashes
const CHUNK_SIZE = 2 * 1024 * 1024;

let isCancelled = false;
let isPaused = false;
let pauseResolver: (() => void) | null = null;

function checkPause(): Promise<void> | void {
  if (isPaused) {
    return new Promise((resolve) => {
      pauseResolver = resolve;
    });
  }
}

/**
 * Computes both MD5 and SHA-256 simultaneously in controlled streaming chunks.
 * Uses ReadableStream if available to stream chunks directly from disk to worker memory,
 * releasing references immediately to allow aggressive V8 garbage collection.
 */
async function hashFileInWorker(
  file: File,
  fileIndex: number,
  totalFiles: number,
  priorBytesProcessed: number,
  totalBatchBytes: number,
  batchStartTime: number
): Promise<{ md5: string; sha256: string }> {
  // ISO/IEC 27037 compliant zero-byte edge case baseline
  if (file.size === 0) {
    self.postMessage({
      type: 'CHUNK_PROGRESS',
      fileId: (file as any)._id,
      fileIndex,
      totalFiles,
      currentFileName: file.name,
      currentFilePercent: 100,
      totalPercent: totalBatchBytes > 0 ? Math.min(100, Math.round(((priorBytesProcessed) / totalBatchBytes) * 100)) : 100,
      bytesProcessed: priorBytesProcessed,
      totalBytes: totalBatchBytes,
      speedBytesPerSec: 0,
      etaSeconds: 0,
    });

    return {
      md5: 'd41d8cd98f00b204e9800998ecf8427e',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };
  }

  const spark = new SparkMD5.ArrayBuffer();
  const sha = sha256.create();

  let bytesReadInFile = 0;
  let lastProgressReportTime = 0;

  const emitProgress = (force = false) => {
    const now = performance.now();
    if (!force && now - lastProgressReportTime < 50) return; // throttle progress posts to ~20Hz
    lastProgressReportTime = now;

    const currentBatchProcessed = priorBytesProcessed + bytesReadInFile;
    const elapsedSec = Math.max(0.05, (Date.now() - batchStartTime) / 1000);
    const speed = currentBatchProcessed / elapsedSec;
    const remainingBatchBytes = Math.max(0, totalBatchBytes - currentBatchProcessed);
    const eta = speed > 0 ? remainingBatchBytes / speed : 0;
    const filePercent = Math.min(100, Math.round((bytesReadInFile / file.size) * 100));
    const totalPercent = totalBatchBytes > 0 
      ? Math.min(100, Math.round((currentBatchProcessed / totalBatchBytes) * 100)) 
      : filePercent;

    self.postMessage({
      type: 'CHUNK_PROGRESS',
      fileId: (file as any)._id,
      fileIndex,
      totalFiles,
      currentFileName: file.name,
      currentFilePercent: filePercent,
      totalPercent,
      bytesProcessed: currentBatchProcessed,
      totalBytes: totalBatchBytes,
      speedBytesPerSec: speed,
      etaSeconds: eta,
    });
  };

  // Attempt Web Streams ReadableStream reader (optimal for multi-gigabyte files)
  let streamWorked = false;
  if (typeof file.stream === 'function') {
    try {
      const reader = file.stream().getReader();
      while (true) {
        if (isCancelled) {
          reader.cancel();
          throw new DOMException('Worker hashing aborted', 'AbortError');
        }
        if (isPaused) {
          await checkPause();
        }

        const { done, value } = await reader.read();
        if (done) break;

        if (value && value.byteLength > 0) {
          bytesReadInFile += value.byteLength;

          // Process memory buffer
          const bufferSlice = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
          spark.append(bufferSlice);
          sha.update(value);

          // Emit real-time micro-interaction metrics
          emitProgress();
        }
      }
      streamWorked = true;
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      console.warn('Worker file.stream() error, falling back to slice reader:', err);
    }
  }

  // Fallback slice chunking (with explicit GC de-allocation of chunk buffers)
  if (!streamWorked) {
    let offset = 0;
    const totalSize = file.size;

    while (offset < totalSize) {
      if (isCancelled) {
        throw new DOMException('Worker hashing aborted', 'AbortError');
      }
      if (isPaused) {
        await checkPause();
      }

      const end = Math.min(offset + CHUNK_SIZE, totalSize);
      const chunk = file.slice(offset, end);
      let arrayBuffer: ArrayBuffer | null = await chunk.arrayBuffer();
      let uint8: Uint8Array | null = new Uint8Array(arrayBuffer);

      spark.append(arrayBuffer);
      sha.update(uint8);

      bytesReadInFile += (end - offset);
      offset = end;

      emitProgress();

      // Explicit Garbage Collection: release memory references immediately before loading next chunk
      arrayBuffer = null;
      uint8 = null;
    }
  }

  emitProgress(true);

  return {
    md5: spark.end().toLowerCase(),
    sha256: sha.hex().toLowerCase(),
  };
}

// Worker message routing
self.onmessage = async (e: MessageEvent) => {
  const { type, action } = e.data || {};

  if (type === 'PAUSE' || action === 'PAUSE') {
    isPaused = true;
    return;
  }

  if (type === 'RESUME' || action === 'RESUME') {
    isPaused = false;
    if (pauseResolver) {
      pauseResolver();
      pauseResolver = null;
    }
    return;
  }

  if (type === 'CANCEL' || action === 'CANCEL') {
    isCancelled = true;
    isPaused = false;
    if (pauseResolver) {
      pauseResolver();
      pauseResolver = null;
    }
    return;
  }

  try {
    isCancelled = false;
    isPaused = false;

    let files: File[] = [];
    const fileIdMap: Record<string, string> = e.data?.fileIdMap || {};

    if (e.data instanceof File) {
      files = [e.data];
    } else if (Array.isArray(e.data)) {
      files = e.data;
    } else if (e.data?.file instanceof File) {
      files = [e.data.file];
    } else if (Array.isArray(e.data?.files)) {
      files = e.data.files;
    } else if (e.data?.files) {
      files = Array.from(e.data.files);
    }

    if (!files || files.length === 0) {
      return;
    }

    const totalBatchBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    let cumulativeBytesProcessed = 0;
    const batchStartTime = Date.now();
    const manifestData: HashManifestResult[] = [];

    for (let i = 0; i < files.length; i++) {
      if (isCancelled) break;

      const file = files[i];
      const relPath = file.webkitRelativePath || file.name;
      const itemId = fileIdMap[file.name] || (file as any)._id || `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      (file as any)._id = itemId;

      self.postMessage({
        type: 'FILE_START',
        fileId: itemId,
        fileIndex: i,
        totalFiles: files.length,
        currentFileName: file.name,
      });

      try {
        const { md5, sha256: sha256Hex } = await hashFileInWorker(
          file,
          i,
          files.length,
          cumulativeBytesProcessed,
          totalBatchBytes,
          batchStartTime
        );

        cumulativeBytesProcessed += file.size;

        const resultItem: HashManifestResult = {
          id: itemId,
          name: file.name,
          relativePath: relPath,
          sizeBytes: file.size,
          mimeType: file.type || 'application/octet-stream',
          lastModified: file.lastModified,
          sha256: sha256Hex,
          md5: md5,
          hashingStatus: 'completed',
          hashProgressPercent: 100,
          verificationStatus: 'unverified',
        };

        manifestData.push(resultItem);

        // Notify that this specific file has finished
        self.postMessage({
          type: 'FILE_COMPLETE',
          fileId: itemId,
          result: resultItem,
          fileIndex: i,
          totalFiles: files.length,
          currentFileName: file.name,
        });
      } catch (fileErr: any) {
        if (fileErr?.name === 'AbortError') {
          break;
        }

        const errorItem: HashManifestResult = {
          id: itemId,
          name: file.name,
          relativePath: relPath,
          sizeBytes: file.size,
          mimeType: file.type || 'application/octet-stream',
          lastModified: file.lastModified,
          sha256: '',
          md5: '',
          hashingStatus: 'error',
          hashProgressPercent: 0,
          verificationStatus: 'unverified',
          errorMessage: fileErr?.message || 'Hashing failed',
        };

        manifestData.push(errorItem);

        self.postMessage({
          type: 'FILE_ERROR',
          fileId: itemId,
          result: errorItem,
          errorMessage: fileErr?.message || 'Hashing failed',
        });
      }
    }

    // Final batch completion signal
    self.postMessage({
      type: 'HASH_COMPLETE',
      manifestData,
      result: manifestData.length === 1 ? manifestData[0] : undefined,
      data: manifestData,
    });
  } catch (err: any) {
    self.postMessage({
      type: 'HASH_ERROR',
      error: err?.message || 'Unknown Web Worker hashing error',
    });
  }
};
