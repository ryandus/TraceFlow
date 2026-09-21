import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Hash, 
  UserCheck, 
  Building2, 
  BadgeCheck, 
  MapPin, 
  Sparkles, 
  Trash2, 
  Check, 
  X,
  Layers
} from 'lucide-react';
import { CaseMetadata } from '../types/forensic';

interface SampleDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearSampleData: () => void;
  metadata: CaseMetadata;
  onInitializeCase?: (intakeValues: Partial<CaseMetadata>, clearFiles: boolean) => void;
}

export const SampleDataModal: React.FC<SampleDataModalProps> = ({
  isOpen,
  onClose,
  onClearSampleData,
  metadata,
  onInitializeCase,
}) => {
  // Controlled form state initialized from current metadata or defaults
  const [caseNumber, setCaseNumber] = useState(metadata.caseNumber || 'DFIR-2026-0941');
  const [examinerName, setExaminerName] = useState(metadata.examinerName || 'Agent J. Reynolds');
  const [examinerBadgeId, setExaminerBadgeId] = useState(metadata.examinerBadgeId || 'DFIR-742');
  const [agencyOrganization, setAgencyOrganization] = useState(metadata.agencyOrganization || 'Digital Forensics & Incident Response Division');
  const [locationFound, setLocationFound] = useState(metadata.locationFound || 'Executive Workstation WS-04, Data Center Floor 2');
  const [retainSampleFiles, setRetainSampleFiles] = useState<boolean>(true);

  // Synchronize if incoming metadata changes
  useEffect(() => {
    if (metadata.caseNumber) setCaseNumber(metadata.caseNumber);
    if (metadata.examinerName) setExaminerName(metadata.examinerName);
    if (metadata.examinerBadgeId) setExaminerBadgeId(metadata.examinerBadgeId);
    if (metadata.agencyOrganization) setAgencyOrganization(metadata.agencyOrganization);
    if (metadata.locationFound) setLocationFound(metadata.locationFound);
  }, [metadata]);

  if (!isOpen) return null;

  const handleInitialize = (e: React.FormEvent) => {
    e.preventDefault();

    const intakeValues: Partial<CaseMetadata> = {
      caseNumber: caseNumber.trim() || 'UNTITLED-CASE',
      examinerName: examinerName.trim() || 'Lead Forensic Examiner',
      examinerBadgeId: examinerBadgeId.trim() || 'EX-01',
      agencyOrganization: agencyOrganization.trim() || 'Digital Forensics Unit',
      locationFound: locationFound.trim() || 'Digital Forensics Laboratory',
    };

    if (onInitializeCase) {
      onInitializeCase(intakeValues, !retainSampleFiles);
    } else {
      if (!retainSampleFiles) {
        onClearSampleData();
      }
      onClose();
    }
  };

  const handleResetToBlank = () => {
    setCaseNumber('');
    setExaminerName('');
    setExaminerBadgeId('');
    setAgencyOrganization('');
    setLocationFound('');
    setRetainSampleFiles(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="intake-modal-title"
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="intake-modal-title" className="text-base font-bold text-slate-100 flex items-center gap-2">
                Investigation Intake & Triage Setup
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                ISO/IEC 27037 Digital Forensics Evidence Baseline
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label="Close intake modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleInitialize} className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-6 space-y-4 text-xs text-slate-300">
            <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-3 flex items-start gap-3 text-cyan-300">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Enter your active investigation parameters below. Submitting will <strong>lock the Case Header</strong> into a compact summary ribbon and automatically propagate your credentials to the <strong>Chain-of-Custody Ledger</strong>.
              </p>
            </div>

            {/* Interactive Inputs */}
            <div className="space-y-3.5 pt-1">
              {/* Case Number */}
              <div>
                <label htmlFor="intake-case-number" className="text-xs font-medium text-slate-200 flex items-center gap-1.5 mb-1">
                  <Hash className="w-3.5 h-3.5 text-cyan-400" />
                  Case Number <span className="text-rose-400">*</span>
                </label>
                <input
                  id="intake-case-number"
                  type="text"
                  required
                  value={caseNumber}
                  onChange={(e) => setCaseNumber(e.target.value)}
                  placeholder="e.g. DFIR-2026-0941"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              {/* Examiner & Badge in Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label htmlFor="intake-examiner-name" className="text-xs font-medium text-slate-200 flex items-center gap-1.5 mb-1">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                    Lead Examiner <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="intake-examiner-name"
                    type="text"
                    required
                    value={examinerName}
                    onChange={(e) => setExaminerName(e.target.value)}
                    placeholder="e.g. Agent J. Reynolds"
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="intake-badge-id" className="text-xs font-medium text-slate-200 flex items-center gap-1.5 mb-1">
                    <BadgeCheck className="w-3.5 h-3.5 text-cyan-400" />
                    Badge / ID
                  </label>
                  <input
                    id="intake-badge-id"
                    type="text"
                    value={examinerBadgeId}
                    onChange={(e) => setExaminerBadgeId(e.target.value)}
                    placeholder="e.g. DFIR-742"
                    className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                </div>
              </div>

              {/* Agency / Organization */}
              <div>
                <label htmlFor="intake-agency" className="text-xs font-medium text-slate-200 flex items-center gap-1.5 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  Agency / Organization <span className="text-rose-400">*</span>
                </label>
                <input
                  id="intake-agency"
                  type="text"
                  required
                  value={agencyOrganization}
                  onChange={(e) => setAgencyOrganization(e.target.value)}
                  placeholder="e.g. Digital Forensics & Incident Response Division"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              {/* Location Found */}
              <div>
                <label htmlFor="intake-location" className="text-xs font-medium text-slate-200 flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Evidence Seizure / Triage Location
                </label>
                <input
                  id="intake-location"
                  type="text"
                  value={locationFound}
                  onChange={(e) => setLocationFound(e.target.value)}
                  placeholder="e.g. Executive Workstation WS-04, Data Center Floor 2"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>

              {/* Retain or Clear Demonstration Files Option */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={retainSampleFiles}
                    onChange={(e) => setRetainSampleFiles(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-slate-300">
                    Include sample container files (RAW disk, RAM dump) for walkthrough
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handleResetToBlank}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Fields
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                Skip
              </button>

              <button
                type="submit"
                id="btn-initialize-case-context"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 shadow-md shadow-cyan-950/50 transition active:scale-95"
              >
                <Check className="w-4 h-4" />
                Initialize Case Context
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
