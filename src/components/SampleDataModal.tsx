import React from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  FileSpreadsheet, 
  Check, 
  Trash2, 
  X, 
  Sparkles, 
  ExternalLink 
} from 'lucide-react';
import { CaseMetadata } from '../types/forensic';

interface SampleDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearSampleData: () => void;
  metadata: CaseMetadata;
}

export const SampleDataModal: React.FC<SampleDataModalProps> = ({
  isOpen,
  onClose,
  onClearSampleData,
  metadata,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="sample-modal-title"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="sample-modal-title" className="text-base font-bold text-slate-100 flex items-center gap-2">
                Forensic Demonstration Case Loaded
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                ISO/IEC 27037 Exemplar Incident Baseline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label="Dismiss demonstration notice"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 text-xs text-slate-300 leading-relaxed">
          <p>
            TraceFlow has initialized with an illustrative digital forensics triage dataset to demonstrate bit-stream image ingestion, cryptographic hashing, and chain-of-custody tracking.
          </p>

          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 font-mono space-y-2">
            <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
              <span className="text-slate-400">Case Number:</span>
              <span className="text-cyan-400 font-bold">{metadata.caseNumber || 'DFIR-2026-0941'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
              <span className="text-slate-400">Lead Examiner:</span>
              <span className="text-slate-200">{metadata.examinerName || 'Agent J. Reynolds'} ({metadata.examinerBadgeId || 'DFIR-742'})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Agency:</span>
              <span className="text-slate-200">{metadata.agencyOrganization || 'Digital Forensics Division'}</span>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2.5 text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              If you are conducting an active investigation, click <strong>Clear to Clean Case</strong> to ensure sample parameters are never incorporated into your court-admissible manifest.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClearSampleData();
              onClose();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/30 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear to Clean Case
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-md shadow-cyan-950/40 transition active:scale-95"
          >
            <Check className="w-4 h-4" />
            Continue with Demonstration Data
          </button>
        </div>
      </div>
    </div>
  );
};
