import React from 'react';
import { 
  AlertTriangle, 
  Loader2, 
  Printer, 
  Clock, 
  CheckCircle2, 
  Gauge, 
  FileText,
  X 
} from 'lucide-react';
import { HashJobProgress } from '../types/forensic';
import { formatSpeed, formatETA } from '../services/hasher';

interface ExportWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueExport: () => void;
  progress: HashJobProgress;
  actionType: 'print' | 'export';
}

export const ExportWarningModal: React.FC<ExportWarningModalProps> = ({
  isOpen,
  onClose,
  onContinueExport,
  progress,
  actionType,
}) => {
  if (!isOpen) return null;

  const currentFileNum = progress.totalFiles > 0 ? progress.currentFileIndex + 1 : 0;
  const currentFileName = progress.currentFileName || 'Evidence container';
  const speedDisplay = progress.speedBytesPerSec > 0 ? formatSpeed(progress.speedBytesPerSec) : 'Calculating...';
  const etaDisplay = formatETA(progress.etaSeconds);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-warning-title"
        className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-amber-950/40 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 id="export-warning-title" className="text-base font-bold text-amber-200">
                Hashing in progress. Export now or wait for completion?
              </h3>
              <p className="text-xs text-amber-300/80 font-mono">
                Active Bit-Stream Verification Underway
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-300 leading-relaxed">
            The background Web Worker is currently streaming and digesting evidence files. Generating a court-admissible manifest before completion will mark unverified exhibits as <strong className="text-amber-400 font-mono">"PENDING CALCULATION"</strong>.
          </p>

          {/* Real-Time Live Calculation Details from Web Worker */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-200 font-semibold">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                Processing File {currentFileNum} of {progress.totalFiles}
              </span>
              <span className="text-cyan-400 font-bold">{progress.totalPercent}% Total</span>
            </div>

            <p className="text-[11px] text-slate-400 truncate" title={currentFileName}>
              Active: <span className="text-slate-200">{currentFileName}</span>
            </p>

            {/* Real-time Global Progress Bar */}
            <div className="space-y-1.5">
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-400 rounded-full transition-all duration-150"
                  style={{ width: `${Math.max(3, progress.totalPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10.5px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-cyan-400" />
                  {speedDisplay}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  ETA: {etaDisplay}
                </span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-800/40 p-3 rounded-lg border border-slate-800">
            <strong>Recommendation:</strong> Wait for bit-level SHA-256 digests to finish for complete ISO/IEC 27037 compliance.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-md transition active:scale-95"
          >
            <Clock className="w-4 h-4" />
            Wait for Completion
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onContinueExport();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 border border-amber-500/30 transition"
          >
            {actionType === 'print' ? (
              <>
                <Printer className="w-4 h-4" />
                Continue to Print (Incomplete)
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Export Incomplete Manifest
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
