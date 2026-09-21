/**
 * TraceFlow Forensic Evidence Hash Worker (hash-worker.js)
 * ISO/IEC 27037 Compliant Streaming Cryptographic Engine
 * 
 * Features:
 * - Controlled 2MB streaming chunks (OOM mitigation for multi-terabyte containers)
 * - Immediate V8 garbage collection of chunk buffers
 * - Concurrent MD5 + SHA-256 generation
 * - Real-time progress micro-interactions (MB/s throughput & ETA calculations)
 */

try {
  importScripts(
    'https://cdnjs.cloudflare.com/ajax/libs/spark-md5/3.0.2/spark-md5.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/js-sha256/0.11.0/sha256.min.js'
  );
} catch (e) {}

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunk buffer for strict OOM mitigation

let isCancelled = false;
let isPaused = false;
let pauseResolver = null;

function checkPause() {
  if (isPaused) {
    return new Promise((resolve) => {
      pauseResolver = resolve;
    });
  }
}

async function hashFileInWorker(
  file,
  fileIndex,
  totalFiles,
  priorBytesProcessed,
  totalBatchBytes,
  batchStartTime
) {
  if (file.size === 0) {
    self.postMessage({
      type: 'CHUNK_PROGRESS',
      fileId: file._id || file.id,
      fileIndex,
      totalFiles,
      currentFileName: file.name,
      currentFilePercent: 100,
      totalPercent: totalBatchBytes > 0 ? Math.min(100, Math.round((priorBytesProcessed / totalBatchBytes) * 100)) : 100,
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
    if (!force && now - lastProgressReportTime < 50) return;
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
      fileId: file._id || file.id,
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

          const bufferSlice = value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
          spark.append(bufferSlice);
          sha.update(value);

          emitProgress();
        }
      }
      streamWorked = true;
    } catch (err) {
      if (err && err.name === 'AbortError') throw err;
      console.warn('Worker file.stream() error, falling back to slice reader:', err);
    }
  }

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
      let arrayBuffer = await chunk.arrayBuffer();
      let uint8 = new Uint8Array(arrayBuffer);

      spark.append(arrayBuffer);
      sha.update(uint8);

      bytesReadInFile += (end - offset);
      offset = end;

      emitProgress();

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

self.onmessage = async (e) => {
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
    if (pauseResolver) {
      pauseResolver();
      pauseResolver = null;
    }
    return;
  }

  if (type === 'PROCESS_FILES' || type === 'START') {
    isCancelled = false;
    isPaused = false;

    const rawFiles = e.data.files || (e.data.file ? [e.data.file] : []);
    const fileIdMap = e.data.fileIdMap || {};

    if (!rawFiles || rawFiles.length === 0) {
      self.postMessage({ type: 'HASH_COMPLETE' });
      return;
    }

    const totalBatchBytes = rawFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const batchStartTime = Date.now();
    let priorBytesProcessed = 0;

    for (let i = 0; i < rawFiles.length; i++) {
      if (isCancelled) break;

      const file = rawFiles[i];
      const assignedId = fileIdMap[file.name] || file._id || file.id || `file-${i}`;
      file._id = assignedId;

      try {
        const digests = await hashFileInWorker(
          file,
          i,
          rawFiles.length,
          priorBytesProcessed,
          totalBatchBytes,
          batchStartTime
        );

        priorBytesProcessed += file.size;

        self.postMessage({
          type: 'FILE_COMPLETE',
          fileId: assignedId,
          fileName: file.name,
          result: {
            sha256: digests.sha256,
            md5: digests.md5,
          },
        });
      } catch (err) {
        if (err && err.name === 'AbortError') {
          self.postMessage({
            type: 'FILE_ERROR',
            fileId: assignedId,
            errorMessage: 'Hashing cancelled by examiner',
          });
          break;
        }

        self.postMessage({
          type: 'FILE_ERROR',
          fileId: assignedId,
          errorMessage: err && err.message ? err.message : 'Cryptographic computation error',
        });
      }
    }

    self.postMessage({ type: 'HASH_COMPLETE' });
  }
};
