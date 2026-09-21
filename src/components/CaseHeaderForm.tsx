import React, { useState, useEffect, useRef } from 'react';
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
  Lock,
  Edit3,
  CheckCircle2,
  X
} from 'lucide-react';
import { CaseMetadata, AcquisitionMethod, MediaType, WriteBlockerType } from '../types/forensic';

interface CaseHeaderFormProps {
  metadata: CaseMetadata;
  onChange: (updated: Partial<CaseMetadata>) => void;
  hasFilesInitiated?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
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

export const CaseHeaderForm: React.FC<CaseHeaderFormProps> = ({ 
  metadata, 
  onChange,
  hasFilesInitiated = false,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [internalExpanded, setInternalExpanded] = useState<boolean>(isCollapsed !== undefined ? !isCollapsed : true);
  const prevFilesInitiatedRef = useRef<boolean>(false);

  useEffect(() => {
    if (isCollapsed !== undefined) {
      setInternalExpanded(!isCollapsed);
    }
  }, [isCollapsed]);

  const isExpanded = isCollapsed !== undefined ? !isCollapsed : internalExpanded;

  const setExpanded = (expanded: boolean) => {
    setInternalExpanded(expanded);
    if (onToggleCollapse) {
      onToggleCollapse(!expanded);
    }
  };

  // Progressive Disclosure: Auto-collapse into a compact locked ribbon when
  // Case Number and Lead Examiner are present and first file drop is initiated
  useEffect(() => {
    const hasRequiredFields = Boolean(metadata.caseNumber?.trim()) && Boolean(metadata.examinerName?.trim());
    if (!prevFilesInitiatedRef.current && hasFilesInitiated && hasRequiredFields) {
      setExpanded(false);
    }
    prevFilesInitiatedRef.current = hasFilesInitiated;
  }, [hasFilesInitiated, metadata.caseNumber, metadata.examinerName]);

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

  const isLockedRibbon = !isExpanded;

  return (
    <div className={`transition-all duration-300 ${
      isLockedRibbon 
        ? 'sticky top-16 z-30 bg-slate-900/95 backdrop-blur-md border border-cyan-500/40 rounded-xl shadow-xl' 
        : 'bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md'
    }`}>
      {/* Compact Read-Only Summary Ribbon (when collapsed with active files) */}
      {isLockedRibbon ? (
        <div className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono shrink-0">
              <Lock className="w-3 h-3 text-cyan-400" />
              <span>LOCKED HEADER</span>
            </div>

            <div className="flex items-center gap-2 truncate font-mono text-[11px]">
              <span className="text-slate-400">Case:</span>
              <strong className="text-cyan-300 font-bold">{metadata.caseNumber || 'UNTITLED'}</strong>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Item:</span>
              <span className="text-slate-200">{metadata.evidenceItemNumber || 'N/A'}</span>
              <span className="text-slate-600 hidden md:inline">|</span>
              <span className="text-slate-400 hidden md:inline">Examiner:</span>
              <span className="text-slate-200 hidden md:inline">{metadata.examinerName} ({metadata.examinerBadgeId || 'ID'})</span>
              <span className="text-slate-600 hidden lg:inline">|</span>
              <span className="text-slate-400 hidden lg:inline">Agency:</span>
              <span className="text-slate-300 hidden lg:inline truncate max-w-xs">{metadata.agencyOrganization}</span>
              <span className="text-slate-600 hidden xl:inline">|</span>
              <span className="text-slate-400 hidden xl:inline">Write-Block:</span>
              <span className="text-emerald-400 hidden xl:inline font-sans truncate">{metadata.writeBlockerUsed}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              title="Unlock / Edit case metadata"
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
              Edit Metadata
            </button>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="p-1 text-slate-400 hover:text-slate-200 transition"
              aria-label="Expand case header"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Full Case Header & Evidence Metadata Form */
        <div>
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
                  {hasFilesInitiated && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      Active Ingestion
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Record acquisition parameters, custodian identifiers, and write-blocking verification.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExpanded(!isExpanded)}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Case Number */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="input-case-number" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-cyan-400" />
                      Case Number <span className="text-rose-400">*</span>
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      id="input-case-number"
                      type="text"
                      value={metadata.caseNumber}
                      onChange={(e) => onChange({ caseNumber: e.target.value })}
                      placeholder="Enter Case # (e.g. 2026-CR-0842)"
                      className="w-full px-3 py-2 pr-8 rounded-lg text-xs font-mono transition bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
                  </div>
                  <div className="relative">
                    <input
                      id="input-evidence-item"
                      type="text"
                      value={metadata.evidenceItemNumber}
                      onChange={(e) => onChange({ evidenceItemNumber: e.target.value })}
                      placeholder="Enter Exhibit # (e.g. ITEM-01A)"
                      className="w-full px-3 py-2 pr-8 rounded-lg text-xs font-mono transition bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    <div className="col-span-3 relative">
                      <input
                        id="input-examiner-name"
                        type="text"
                        value={metadata.examinerName}
                        onChange={(e) => onChange({ examinerName: e.target.value })}
                        placeholder="Examiner Name"
                        className="w-full px-3 py-2 pr-7 rounded-lg text-xs transition bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
                        className="w-full px-2.5 py-2 pr-6 rounded-lg text-xs font-mono transition bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
                  </div>
                  <div className="relative">
                    <input
                      id="input-agency"
                      type="text"
                      value={metadata.agencyOrganization}
                      onChange={(e) => onChange({ agencyOrganization: e.target.value })}
                      placeholder="Agency / Department / Lab"
                      className="w-full px-3 py-2 pr-8 rounded-lg text-xs transition bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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

              {/* Source Acquisition & Media Specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                {/* Acquisition Method */}
                <div>
                  <label htmlFor="select-acquisition-method" className="block text-xs font-medium text-slate-300 mb-1">
                    Acquisition Method
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

                {/* Media Type */}
                <div>
                  <label htmlFor="select-media-type" className="block text-xs font-medium text-slate-300 mb-1">
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

                {/* Write Blocker Used */}
                <div>
                  <label htmlFor="select-write-blocker" className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-emerald-400" />
                    Write-Blocker Hardware/Driver
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
                  </div>
                  <div className="relative">
                    <input
                      id="input-location-found"
                      type="text"
                      value={metadata.locationFound}
                      onChange={(e) => onChange({ locationFound: e.target.value })}
                      placeholder="e.g. Primary Server Rack C-12, Datacenter Room 4, 100 Main St"
                      className="w-full px-3 py-2 pr-8 rounded-lg text-xs transition bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
                  </div>
                  <div className="relative">
                    <input
                      id="input-case-notes"
                      type="text"
                      value={metadata.notes}
                      onChange={(e) => onChange({ notes: e.target.value })}
                      placeholder="e.g. Power state active upon arrival, device bagged in anti-static pouch"
                      className="w-full px-3 py-2 pr-8 rounded-lg text-xs transition bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
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
      )}
    </div>
  );
};
