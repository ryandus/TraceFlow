import React, { useEffect, useRef, useState } from 'react';
import { 
  UploadCloud, 
  FolderPlus, 
  FilePlus2, 
  Pause, 
  Play, 
  XCircle, 
  Activity, 
  Gauge, 
  Timer, 
  CheckCircle2, 
  AlertTriangle,
  Beaker
} from 'lucide-react';
import { EvidenceFile, HashJobProgress } from '../types/forensic';
import { formatBytes, formatSpeed, formatETA } from '../services/hasher';
import HashWorker from './hash.worker?worker';

interface EvidenceFileIngestionProps {
  onFilesSelected: (files: FileList | File[] | EvidenceFile[], isDirectory?: boolean) => void;
  onLoadSampleData: () => void;
  progress: HashJobProgress;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  isQueueEmpty: boolean;
}

export const EvidenceFileIngestion: React.FC<EvidenceFileIngestionProps> = ({
  onFilesSelected,
  onLoadSampleData,
  progress,
  onPause,
  onResume,
  onCancel,
  isQueueEmpty,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dropOverlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dirInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize dedicated local Web Worker for parallel background hashing
  useEffect(() => {
    let worker: Worker;
    try {
      worker = new HashWorker();
    } catch {
      worker = new Worker(new URL('./hash.worker.ts', import.meta.url), {
        type: 'module',
      });
    }

    // Listen for Results: Handle onmessage event from worker to retrieve final hash manifest data
    worker.onmessage = (e: MessageEvent) => {
      const { type, manifestData, data, result } = e.data || {};
      if (type === 'HASH_COMPLETE' || manifestData || data) {
        const finalManifest: EvidenceFile[] = manifestData || data || (result ? [result] : []);
        if (finalManifest && finalManifest.length > 0) {
          onFilesSelected(finalManifest);
        }
      }
    };

    worker.onerror = (err) => {
      console.error('hash.worker.ts error:', err);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [onFilesSelected]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    if (dropOverlayRef.current) {
      dropOverlayRef.current.style.display = 'flex';
      dropOverlayRef.current.classList.add('active');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDragging(true);
    if (dropOverlayRef.current) {
      dropOverlayRef.current.style.display = 'flex';
      dropOverlayRef.current.classList.add('active');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Immediately update state to hide drag overlay
    setIsDragging(false);
    if (dropOverlayRef.current) {
      dropOverlayRef.current.style.display = 'none';
      dropOverlayRef.current.classList.remove('active');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    // 1. Prevent default behavior so browser doesn't intercept or attempt to open the file
    e.preventDefault();
    e.stopPropagation();

    // 2. Immediate UI Update: Immediately set state to hide drag-and-drop overlay
    setIsDragging(false);
    if (dropOverlayRef.current) {
      dropOverlayRef.current.style.display = 'none';
      dropOverlayRef.current.classList.remove('active');
    }

    const droppedFiles: File[] = [];

    // Extract files from DataTransferItemList if available (supports modern drop handling)
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            droppedFiles.push(file);
          }
        }
      }
    }

    // Fallback to dataTransfer.files if items did not produce files
    if (droppedFiles.length === 0 && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        droppedFiles.push(e.dataTransfer.files[i]);
      }
    }

    // 3. Use postMessage: Immediately postMessage the file object to Web Worker for parallel, asynchronous processing
    if (droppedFiles.length > 0) {
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'PROCESS_FILES',
          files: droppedFiles,
          file: droppedFiles[0],
        });
      } else {
        onFilesSelected(droppedFiles);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'PROCESS_FILES',
          files,
          file: files[0],
        });
      } else {
        onFilesSelected(e.target.files);
      }
      e.target.value = ''; // Reset input to allow re-selecting same files
    }
  };

  const handleDirInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'PROCESS_FILES',
          files,
          file: files[0],
        });
      } else {
        onFilesSelected(e.target.files, true);
      }
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Active Processing Monitor (shown when hashing is underway) */}
      {progress.isHashing && (
        <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-xl p-4 shadow-lg shadow-cyan-950/20 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 animate-pulse">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 font-mono">
                    Dual-Stream Hashing Engine Active
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    File {progress.currentFileIndex + 1} of {progress.totalFiles}
                  </span>
                  {progress.isPaused && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      PAUSED
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold text-slate-100 font-mono truncate max-w-md md:max-w-lg">
                  {progress.currentFileName}
                </p>
              </div>
            </div>

            {/* Controller Controls */}
            <div className="flex items-center gap-2">
              {progress.isPaused ? (
                <button
                  type="button"
                  onClick={onResume}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Resume
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onPause}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition active:scale-95"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  Pause
                </button>
              )}

              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition active:scale-95"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel Operation
              </button>
            </div>
          </div>

          {/* Dual Progress Bars: Current File & Total Job */}
          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                <span>Current File Progress</span>
                <span className="text-cyan-400 font-semibold">{progress.currentFilePercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-cyan-400 transition-all duration-150 rounded-full"
                  style={{ width: `${progress.currentFilePercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                <span>Total Batch Volume</span>
                <span>{progress.totalPercent}% ({formatBytes(progress.bytesProcessed)} / {formatBytes(progress.totalBytes)})</span>
              </div>
              <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-150 rounded-full"
                  style={{ width: `${progress.totalPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 font-mono text-xs">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Throughput</span>
                <span className="text-slate-200 font-semibold">{formatSpeed(progress.speedBytesPerSec)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Timer className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Estimated ETA</span>
                <span className="text-slate-200 font-semibold">{formatETA(progress.etaSeconds)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Algorithms</span>
                <span className="text-slate-200 font-semibold">SHA-256 + MD5</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block">Execution Mode</span>
                <span className="text-slate-200 font-semibold">Stream Chunk (2MB)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ingestion Dropzone & Selectors */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-6 md:p-8 transition-all duration-200 text-center ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/20 scale-[1.005]'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
        }`}
      >
        {/* Active Drop Overlay */}
        <div
          ref={dropOverlayRef}
          aria-hidden={!isDragging}
          style={{ display: isDragging ? 'flex' : 'none' }}
          className={`absolute inset-0 z-20 bg-cyan-950/90 backdrop-blur-xs flex flex-col items-center justify-center p-6 border-2 border-dashed border-cyan-400 rounded-xl pointer-events-none transition-all duration-150 ${
            isDragging ? 'active opacity-100' : 'opacity-0 hidden'
          }`}
        >
          <UploadCloud className="w-12 h-12 text-cyan-400 animate-bounce mb-2" />
          <h4 className="text-sm font-bold text-slate-100 font-mono">
            Drop Evidence Files to Ingest & Compute Hashes
          </h4>
          <p className="text-xs text-cyan-300 font-mono mt-1">
            Concurrent SHA-256 + MD5 checksums will be calculated in local memory
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
        <input
          ref={dirInputRef}
          type="file"
          {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          multiple
          onChange={handleDirInputChange}
          className="hidden"
        />

        <div className="max-w-xl mx-auto space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Drag & Drop Evidence Files, Forensic Disk Images, or Triage Dirs
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Supports raw chunks, .E01, .001, .dd, .vmdk, triage zip archives, memory dumps, and individual files.
              Files are processed <strong>strictly in browser memory</strong> using Web Streams. Never uploaded.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              id="btn-select-files"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 shadow-sm transition active:scale-95"
            >
              <FilePlus2 className="w-4 h-4 text-cyan-400" />
              Select Files
            </button>

            <button
              id="btn-select-folder"
              type="button"
              onClick={() => dirInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 shadow-sm transition active:scale-95"
            >
              <FolderPlus className="w-4 h-4 text-cyan-400" />
              Select Triage Directory
            </button>

            {isQueueEmpty && (
              <button
                id="btn-load-sample-data"
                type="button"
                onClick={onLoadSampleData}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-700/50 transition active:scale-95"
                title="Populate with ISO/IEC 27037 sample evidence items and expected hashes to evaluate"
              >
                <Beaker className="w-4 h-4 text-cyan-400" />
                Load Forensic Sample Data
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
