import SparkMD5 from 'spark-md5';
import { sha256 } from 'js-sha256';

export interface ChunkHashResult {
  md5: string;
  sha256: string;
}

export interface HashProgressCallbackParams {
  bytesProcessedCurrent: number;
  fileSizeBytes: number;
  currentFilePercent: number;
  totalBytesProcessed: number;
  totalSessionBytes: number;
  throughputBytesPerSec: number;
}

export type HashProgressCallback = (params: HashProgressCallbackParams) => void;

const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks for smooth UI and fast memory throughput

export class ForensicHashEngine {
  private abortController: AbortController | null = null;
  private isPaused: boolean = false;
  private pausePromiseResolver: (() => void) | null = null;

  public cancel() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.resume();
  }

  public pause() {
    this.isPaused = true;
  }

  public resume() {
    this.isPaused = false;
    if (this.pausePromiseResolver) {
      this.pausePromiseResolver();
      this.pausePromiseResolver = null;
    }
  }

  public getPaused(): boolean {
    return this.isPaused;
  }

  public reset() {
    this.isPaused = false;
    if (this.pausePromiseResolver) {
      this.pausePromiseResolver();
      this.pausePromiseResolver = null;
    }
  }

  /**
   * Reads a Blob or File slice into an ArrayBuffer with FileReader fallback
   * to guard against cross-realm and iframe sandboxing restrictions.
   */
  private async readBlobChunk(chunk: Blob): Promise<ArrayBuffer> {
    if (typeof chunk.arrayBuffer === 'function') {
      try {
        return await chunk.arrayBuffer();
      } catch (err) {
        console.warn('chunk.arrayBuffer() failed, falling back to FileReader:', err);
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(reader.result);
        } else {
          reject(new Error('FileReader did not return an ArrayBuffer'));
        }
      };
      reader.onerror = () => {
        reject(reader.error || new Error('FileReader failed to read file chunk'));
      };
      reader.readAsArrayBuffer(chunk);
    });
  }

  /**
   * Computes both MD5 and SHA-256 simultaneously in chunks using streaming algorithms.
   */
  public async hashFile(
    file: File | Blob,
    onProgress?: (bytesProcessed: number, percent: number) => void,
    externalSignal?: AbortSignal
  ): Promise<ChunkHashResult> {
    // Ensure engine is not in a paused state when starting a file
    this.reset();

    // Zero-byte edge case handling per ISO/IEC 27037
    if (file.size === 0) {
      if (onProgress) onProgress(0, 100);
      return {
        md5: 'd41d8cd98f00b204e9800998ecf8427e',
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      };
    }

    const spark = new SparkMD5.ArrayBuffer();
    const sha = sha256.create();

    let offset = 0;
    const totalSize = file.size;

    while (offset < totalSize) {
      if (externalSignal?.aborted) {
        throw new DOMException('Hashing cancelled', 'AbortError');
      }

      if (this.isPaused) {
        await new Promise<void>((resolve) => {
          this.pausePromiseResolver = resolve;
        });
      }

      const end = Math.min(offset + CHUNK_SIZE, totalSize);
      const chunk = file.slice(offset, end);
      const arrayBuffer = await this.readBlobChunk(chunk);

      // Convert to Uint8Array for js-sha256 to ensure cross-realm ArrayBuffer.isView succeeds
      const uint8 = new Uint8Array(arrayBuffer);

      spark.append(arrayBuffer);
      sha.update(uint8);

      offset = end;
      const percent = Math.min(100, Math.round((offset / totalSize) * 100));

      if (onProgress) {
        onProgress(offset, percent);
      }

      // Yield back to browser event loop to maintain 60fps responsiveness
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const md5Digest = spark.end().toLowerCase();
    const sha256Digest = sha.hex().toLowerCase();

    return {
      md5: md5Digest,
      sha256: sha256Digest,
    };
  }
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

export function formatETA(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return '--:--';
  if (seconds > 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s}s`;
}
