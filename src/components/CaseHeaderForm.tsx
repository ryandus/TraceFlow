import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Clock, 
  HardDrive, 
  ShieldAlert, 
  MapPin, 
  UserCheck, 
  ChevronDown, 
  ChevronUp, 
  Hash, 
  Building2,
  Cpu,
  Info,
  AlertTriangle,
  Trash2,
  Sparkles,
  X
} from 'lucide-react';
import { CaseMetadata, AcquisitionMethod, MediaType, WriteBlockerType } from '../types/forensic';

interface CaseHeaderFormProps {
  metadata: CaseMetadata;
  onChange: (updated: Partial<CaseMetadata>) => void;
}

export const SAMPLE_CASE_DEFAULTS = {
  caseNumber: 'DFIR-2026-0941',
  evidenceItemNumber: 'ITEM-01',
  examinerName: 'Agent J. Reynolds',
  examinerBadgeId: 'DFIR-742',
  agencyOrganization: 'Digital Forensics & Incident Response Division',
  locationFound: 'Executive Workstation WS-04, Data Center Floor 2',
  notes: 'Acquired on-site following security breach notification. Drive unseated and attached to Tableau T8u.',
};

const ACQUISITION_METHODS: AcquisitionMethod[] = [
  'Physical (Bit-stream Image / Raw dd)',
  'Logical (Partition / File System Extraction)',
  'Targeted File Copy (Selective Triage)',
  'Triage Image (Live Volatile / Memory Artifact)',
  'Forensic Container (E01 / AFF4 / VHDX)',
];

const MEDIA_TYPES: MediaType[] = [
  'NVMe M.2 / PCIe SSD',
  'SATA SSD / HDD',
  'USB Flash Drive / External Media',
  'Mobile Device (eMMC / UFS Flash)',
  'SD / MicroSD Memory Card',
  'Virtual Machine Disk (VMDK / VHDX)',
  'RAM / Volatile Memory Dump',
  'Cloud Object / Volume Snapshot',
  'Optical Media (CD/DVD/Blu-ray)',
  'Other / Custom Media',
];

const WRITE_BLOCKERS: WriteBlockerType[] = [
  'Hardware Write Blocker (Tableau / WiebeTech)',
  'Software Write Blocker / Registry Enforced',
  'Read-Only Hardware Bridge',
  'Read-Only OS Mount Flag (Linux ro,loop)',
  'N/A - Live Triage Ingestion',
  'None / Not Verified',
];

export const CaseHeaderForm: React.FC<CaseHeaderFormProps> = ({ metadata, onChange }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Check which fields hold the initial demonstration sample data
  const isSampleCaseNumber = metadata.caseNumber === SAMPLE_CASE_DEFAULTS.caseNumber;
  const isSampleItemNumber = metadata.evidenceItemNumber === SAMPLE_CASE_DEFAULTS.evidenceItemNumber;
  const isSampleExaminer = metadata.examinerName === SAMPLE_CASE_DEFAULTS.examinerName;
  const isSampleBadge = metadata.examinerBadgeId === SAMPLE_CASE_DEFAULTS.examinerBadgeId;
  const isSampleAgency = metadata.agencyOrganization === SAMPLE_CASE_DEFAULTS.agencyOrganization;
  const isSampleLocation = metadata.locationFound === SAMPLE_CASE_DEFAULTS.locationFound;
  const isSampleNotes = metadata.notes === SAMPLE_CASE_DEFAULTS.notes;

  const hasAnySampleValues = 
    isSampleCaseNumber || 
    isSampleItemNumber || 
    isSampleExaminer || 
    isSampleBadge || 
    isSampleAgency || 
    isSampleLocation || 
    isSampleNotes;

  const handleClearAllSamples = () => {
    onChange({
      caseNumber: isSampleCaseNumber ? '' : metadata.caseNumber,
      evidenceItemNumber: isSampleItemNumber ? '' : metadata.evidenceItemNumber,
      examinerName: isSampleExaminer ? '' : metadata.examinerName,
      examinerBadgeId: isSampleBadge ? '' : metadata.examinerBadgeId,
      agencyOrganization: isSampleAgency ? '' : metadata.agencyOrganization,
      locationFound: isSampleLocation ? '' : metadata.locationFound,
      notes: isSampleNotes ? '' : metadata.notes,
    });
  };

  const handleLoadSampleTemplate = () => {
    onChange(SAMPLE_CASE_DEFAULTS);
  };

  const fillCurrentTime = (type: 'UTC' | 'Local') => {
    const now = new Date();
    if (type === 'UTC') {
      const utcString = now.toISOString().slice(0, 16);
      onChange({ collectionDateTime: utcString, collectionTimeZone: 'UTC' });
    } else {
      const offset = now.getTimezoneOffset() * 60000;
      const localISOTime = new Date(now.getTime() - offset).toISOString().slice(0, 16);
      onChange({ collectionDateTime: localISOTime, collectionTimeZone: 'Local' });
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
      {/* Header Bar */}
      <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Case Header & Evidence Metadata
              </h2>
              <span className="text-[10px] font-normal uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60 font-mono">
                Section 1 • ISO/IEC 27037
              </span>
              {hasAnySampleValues && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Contains Sample Demonstration Values
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Record acquisition parameters, custodian identifiers, and write-blocking verification.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasAnySampleValues ? (
            <button
              type="button"
              onClick={handleClearAllSamples}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition"
              title="Clear pre-filled sample text so it won't be saved in your case manifest"
            >
              <Trash2 className="w-3 h-3 text-amber-400" />
              Clear Sample Data
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLoadSampleTemplate}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800 border border-slate-700 transition"
              title="Load sample template values for demonstration"
            >
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Load Sample Template
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            aria-label={isExpanded ? 'Collapse case header form' : 'Expand case header form'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Form Content */}
      {isExpanded && (
        <div className="p-5 space-y-4">
          {/* Prominent Sample Demonstration Banner */}
          {hasAnySampleValues && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-amber-300">
                      Sample Case Demonstration Data Loaded — Fillable Form Fields
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                      Sample Template
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-relaxed">
                    The fields highlighted in amber (e.g. <em>Case DFIR-2026-0941</em>, <em>Agent J. Reynolds</em>) are pre-filled as demonstration examples. Replace them with your actual case records or click <strong>Clear Sample Fields</strong> so placeholder text is never accidentally included or submitted in a real manifest.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={handleClearAllSamples}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 transition shadow-sm active:scale-95 whitespace-nowrap"
                  title="Wipe all prefilled sample demonstration fields to blank placeholders"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Sample Fields
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Case Number */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="input-case-number" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-cyan-400" />
                  Case Number <span className="text-rose-400">*</span>
                </label>
                {isSampleCaseNumber && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    SAMPLE
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="input-case-number"
                  type="text"
                  value={metadata.caseNumber}
                  onChange={(e) => onChange({ caseNumber: e.target.value })}
                  placeholder="Enter Case # (e.g. 2026-CR-0842)"
                  className={`w-full px-3 py-2 pr-8 rounded-lg text-xs font-mono transition focus:outline-none focus:ring-1 ${
                    isSampleCaseNumber
                      ? 'bg-amber-950/20 border border-amber-500/50 text-amber-200 placeholder-amber-400/40 focus:border-cyan-500 focus:bg-slate-950 focus:text-slate-100 focus:ring-cyan-500'
                      : 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500'
                  }`}
                />
                {metadata.caseNumber && (
                  <button
                    type="button"
                    onClick={() => onChange({ caseNumber: '' })}
                    title="Clear field"
                    className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-200 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Evidence Item # */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="input-evidence-item" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  Evidence Item # / Exhibit <span className="text-rose-400">*</span>
                </label>
                {isSampleItemNumber && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    SAMPLE
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="input-evidence-item"
                  type="text"
                  value={metadata.evidenceItemNumber}
                  onChange={(e) => onChange({ evidenceItemNumber: e.target.value })}
                  placeholder="Enter Exhibit # (e.g. ITEM-01A)"
                  className={`w-full px-3 py-2 pr-8 rounded-lg text-xs font-mono transition focus:outline-none focus:ring-1 ${
                    isSampleItemNumber
                      ? 'bg-amber-950/20 border border-amber-500/50 text-amber-200 placeholder-amber-400/40 focus:border-cyan-500 focus:bg-slate-950 focus:text-slate-100 focus:ring-cyan-500'
                      : 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500'
                  }`}
                />
                {metadata.evidenceItemNumber && (
                  <button
                    type="button"
                    onClick={() => onChange({ evidenceItemNumber: '' })}
                    title="Clear field"
                    className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-200 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Examiner Name / Badge */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="input-examiner-name" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Lead Examiner & Badge <span className="text-rose-400">*</span>
                </label>
                {(isSampleExaminer || isSampleBadge) && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    SAMPLE
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                <div className="col-span-3 relative">
                  <input
                    id="input-examiner-name"
                    type="text"
                    value={metadata.examinerName}
                    onChange={(e) => onChange({ examinerName: e.target.value })}
                    placeholder="Examiner Name"
                    className={`w-full px-3 py-2 pr-7 rounded-lg text-xs transition focus:outline-none focus:ring-1 ${
                      isSampleExaminer
                        ? 'bg-amber-950/20 border border-amber-500/50 text-amber-200 placeholder-amber-400/40 focus:border-cyan-500 focus:bg-slate-950 focus:text-slate-100 focus:ring-cyan-500'
                        : 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500'
                    }`}
                  />
                  {metadata.examinerName && (
                    <button
                      type="button"
                      onClick={() => onChange({ examinerName: '' })}
                      title="Clear field"
                      className="absolute right-1.5 top-2.5 text-slate-400 hover:text-slate-200 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="col-span-2 relative">
                  <input
                    id="input-examiner-badge"
                    type="text"
                    value={metadata.examinerBadgeId}
                    onChange={(e) => onChange({ examinerBadgeId: e.target.value })}
                    placeholder="Badge / ID"
                    className={`w-full px-2.5 py-2 pr-6 rounded-lg text-xs font-mono transition focus:outline-none focus:ring-1 ${
                      isSampleBadge
                        ? 'bg-amber-950/20 border border-amber-500/50 text-amber-200 placeholder-amber-400/40 focus:border-cyan-500 focus:bg-slate-950 focus:text-slate-100 focus:ring-cyan-500'
                        : 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500'
                    }`}
                  />
                  {metadata.examinerBadgeId && (
                    <button
                      type="button"
                      onClick={() => onChange({ examinerBadgeId: '' })}
                      title="Clear field"
                      className="absolute right-1.5 top-2.5 text-slate-400 hover:text-slate-200 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Agency / Organization */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="input-agency" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  Agency / Organization
                </label>
                {isSampleAgency && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    SAMPLE
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="input-agency"
                  type="text"
                  value={metadata.agencyOrganization}
                  onChange={(e) => onChange({ agencyOrganization: e.target.value })}
                  placeholder="e.g. Cyber DFIR & Evidence Unit"
                  className={`w-full px-3 py-2 pr-8 rounded-lg text-xs transition focus:outline-none focus:ring-1 ${
                    isSampleAgency
                      ? 'bg-amber-950/20 border border-amber-500/50 text-amber-200 placeholder-amber-400/40 focus:border-cyan-500 focus:bg-slate-950 focus:text-slate-100 focus:ring-cyan-500'
                      : 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500'
                  }`}
                />
                {metadata.agencyOrganization && (
                  <button
                    type="button"
                    onClick={() => onChange({ agencyOrganization: '' })}
                    title="Clear field"
                    className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-200 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            {/* Source Acquisition Method */}
            <div>
              <label htmlFor="select-acquisition-method" className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Source Acquisition Method
              </label>
              <select
                id="select-acquisition-method"
                value={metadata.sourceAcquisitionMethod}
                onChange={(e) => onChange({ sourceAcquisitionMethod: e.target.value as AcquisitionMethod })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              >
                {ACQUISITION_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>

            {/* Media / Drive Type */}
            <div>
              <label htmlFor="select-media-type" className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                Source Drive / Media Type
              </label>
              <select
                id="select-media-type"
                value={metadata.mediaType}
                onChange={(e) => onChange({ mediaType: e.target.value as MediaType })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              >
                {MEDIA_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Write Blocker */}
            <div>
              <label htmlFor="select-write-blocker" className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                Write-Blocker Enforced
              </label>
              <select
                id="select-write-blocker"
                value={metadata.writeBlockerUsed}
                onChange={(e) => onChange({ writeBlockerUsed: e.target.value as WriteBlockerType })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              >
                {WRITE_BLOCKERS.map((wb) => (
                  <option key={wb} value={wb}>
                    {wb}
                  </option>
                ))}
              </select>
            </div>

            {/* Collection Date/Time */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="input-collection-date" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Collection Date/Time
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => fillCurrentTime('UTC')}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-mono transition"
                  >
                    Now (UTC)
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCurrentTime('Local')}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-mono transition"
                  >
                    Local
                  </button>
                </div>
              </div>
              <input
                id="input-collection-date"
                type="datetime-local"
                value={metadata.collectionDateTime}
                onChange={(e) => onChange({ collectionDateTime: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
            </div>
          </div>

          {/* Notes & Location Found */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
            {/* Location Found */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="input-location-found" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Evidence Location Found / Physical Site
                </label>
                {isSampleLocation && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    SAMPLE
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="input-location-found"
                  type="text"
                  value={metadata.locationFound}
                  onChange={(e) => onChange({ locationFound: e.target.value })}
                  placeholder="e.g. Primary Server Rack C-12, Datacenter Room 4, 100 Main St"
                  className={`w-full px-3 py-2 pr-8 rounded-lg text-xs transition focus:outline-none focus:ring-1 ${
                    isSampleLocation
                      ? 'bg-amber-950/20 border border-amber-500/50 text-amber-200 placeholder-amber-400/40 focus:border-cyan-500 focus:bg-slate-950 focus:text-slate-100 focus:ring-cyan-500'
                      : 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500'
                  }`}
                />
                {metadata.locationFound && (
                  <button
                    type="button"
                    onClick={() => onChange({ locationFound: '' })}
                    title="Clear field"
                    className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-200 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="input-case-notes" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  Forensic Ingestion Notes & Observations
                </label>
                {isSampleNotes && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    SAMPLE
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="input-case-notes"
                  type="text"
                  value={metadata.notes}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  placeholder="e.g. Power state active upon arrival, warm boot avoided, device bagged in anti-static pouch"
                  className={`w-full px-3 py-2 pr-8 rounded-lg text-xs transition focus:outline-none focus:ring-1 ${
                    isSampleNotes
                      ? 'bg-amber-950/20 border border-amber-500/50 text-amber-200 placeholder-amber-400/40 focus:border-cyan-500 focus:bg-slate-950 focus:text-slate-100 focus:ring-cyan-500'
                      : 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-cyan-500'
                  }`}
                />
                {metadata.notes && (
                  <button
                    type="button"
                    onClick={() => onChange({ notes: '' })}
                    title="Clear field"
                    className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-200 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

