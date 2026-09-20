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

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB streaming chunks for high throughput

/**
 * Computes both MD5 and SHA-256 simultaneously in chunks using Web Streams / slices.
 */
async function hashFileInWorker(file: File): Promise<{ md5: string; sha256: string }> {
  // ISO/IEC 27037 compliant zero-byte edge case
  if (file.size === 0) {
    return {
      md5: 'd41d8cd98f00b204e9800998ecf8427e',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };
  }

  const spark = new SparkMD5.ArrayBuffer();
  const sha = sha256.create();

  // Try Web Streams reader first if supported by browser File implementation
  if (typeof file.stream === 'function') {
    try {
      const reader = file.stream().getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value && value.byteLength > 0) {
          spark.append(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
          sha.update(value);
        }
      }

      return {
        md5: spark.end().toLowerCase(),
        sha256: sha.hex().toLowerCase(),
      };
    } catch (streamErr) {
      console.warn('Web Streams read failed in worker, falling back to slice chunking:', streamErr);
    }
  }

  // Fallback slice chunking
  let offset = 0;
  const totalSize = file.size;

  while (offset < totalSize) {
    const end = Math.min(offset + CHUNK_SIZE, totalSize);
    const chunk = file.slice(offset, end);
    const arrayBuffer = await chunk.arrayBuffer();
    spark.append(arrayBuffer);
    sha.update(new Uint8Array(arrayBuffer));
    offset = end;
  }

  return {
    md5: spark.end().toLowerCase(),
    sha256: sha.hex().toLowerCase(),
  };
}

// Listen for incoming messages from main thread
self.onmessage = async (e: MessageEvent) => {
  try {
    let files: File[] = [];

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

    const manifestData: HashManifestResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relPath = file.webkitRelativePath || file.name;
      const itemId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      try {
        const { md5, sha256: sha256Hex } = await hashFileInWorker(file);

        manifestData.push({
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
        });
      } catch (fileErr: any) {
        manifestData.push({
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
        });
      }

      // Notify progress for individual file completion
      self.postMessage({
        type: 'HASH_PROGRESS',
        fileIndex: i,
        totalFiles: files.length,
        currentFileName: file.name,
      });
    }

    // Send final hash manifest data once heavy processing completes silently in background
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
