import React, { useRef, useState } from 'react';
import { 
  GitCommit, 
  Plus, 
  Clock, 
  ArrowRight, 
  ShieldCheck, 
  UserCheck, 
  MapPin, 
  FileSignature, 
  Eraser, 
  Tag, 
  Package,
  Calendar,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Edit3,
  Trash2,
  Info
} from 'lucide-react';
import { CustodyTransferEntry } from '../types/forensic';

interface ChainOfCustodyLedgerProps {
  entries: CustodyTransferEntry[];
  defaultExaminer: string;
  defaultBadge: string;
  defaultAgency: string;
  onAddEntry: (entry: Omit<CustodyTransferEntry, 'id' | 'sequenceNumber'>) => void;
  onUpdateEntry?: (entryId: string, updated: Partial<CustodyTransferEntry>) => void;
  onRemoveEntry?: (entryId: string) => void;
  onClearLedger?: () => void;
}

const COMMON_PURPOSES = [
  'Initial Evidence Ingestion & Securing',
  'Transfer to Forensic Laboratory for Acquisition',
  'Laboratory Analysis & Timeline Reconstruction',
  'Evidence Vault Secure Storage',
  'eDiscovery Production & Legal Counsel Review',
  'Courtroom Exhibit Presentation',
  'Return to Lawful Owner / Authorized Final Disposition',
];

export const ChainOfCustodyLedger: React.FC<ChainOfCustodyLedgerProps> = ({
  entries,
  defaultExaminer,
  defaultBadge,
  defaultAgency,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onClearLedger,
}) => {
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  
  // Form State
  const [timestamp, setTimestamp] = useState(() => new Date().toISOString().slice(0, 16));
  const [releasedByName, setReleasedByName] = useState(defaultExaminer || '');
  const [releasedByRole, setReleasedByRole] = useState(defaultBadge || '');
  const [releasedByAgency, setReleasedByAgency] = useState(defaultAgency || '');
  
  const [receivedByName, setReceivedByName] = useState('');
  const [receivedByRole, setReceivedByRole] = useState('');
  const [receivedByAgency, setReceivedByAgency] = useState(defaultAgency || '');

  const [purpose, setPurpose] = useState(COMMON_PURPOSES[0]);
  const [customPurpose, setCustomPurpose] = useState('');
  const [transferLocation, setTransferLocation] = useState('');
  const [packagingCondition, setPackagingCondition] = useState('');
  const [signeeInitials, setSigneeInitials] = useState('');

  // Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Detect if an entry is an example
  const isEntryExample = (entry: CustodyTransferEntry) => {
    return (
      entry.isExample === true ||
      (entry.sequenceNumber === 1 &&
        (entry.releasedByName.toLowerCase().includes('secops') ||
          entry.receivedByName.toLowerCase().includes('reynolds') ||
          entry.packagingCondition.includes('TT-9104')))
    );
  };

  const hasAnyExample = entries.some(isEntryExample);

  const fillTime = (mode: 'UTC' | 'Local') => {
    const now = new Date();
    if (mode === 'UTC') {
      setTimestamp(now.toISOString().slice(0, 16));
    } else {
      const offset = now.getTimezoneOffset() * 60000;
      setTimestamp(new Date(now.getTime() - offset).toISOString().slice(0, 16));
    }
  };

  const handleClearModalForm = () => {
    setReleasedByName('');
    setReleasedByRole('');
    setReleasedByAgency('');
    setReceivedByName('');
    setReceivedByRole('');
    setReceivedByAgency('');
    setTransferLocation('');
    setPackagingCondition('');
    setSigneeInitials('');
    setCustomPurpose('');
    clearCanvas();
  };

  const handleOpenAddForm = () => {
    setEditingEntryId(null);
    setTimestamp(new Date().toISOString().slice(0, 16));
    setReleasedByName(defaultExaminer || '');
    setReleasedByRole(defaultBadge || '');
    setReleasedByAgency(defaultAgency || '');
    setReceivedByName('');
    setReceivedByRole('');
    setReceivedByAgency(defaultAgency || '');
    setPurpose(COMMON_PURPOSES[0]);
    setCustomPurpose('');
    setTransferLocation('');
    setPackagingCondition('');
    setSigneeInitials('');
    clearCanvas();
    setShowFormModal(true);
  };

  const handleStartEdit = (entry: CustodyTransferEntry) => {
    setEditingEntryId(entry.id);
    setTimestamp(entry.timestamp ? new Date(entry.timestamp).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setReleasedByName(entry.releasedByName || '');
    setReleasedByRole(entry.releasedByRole || '');
    setReleasedByAgency(entry.releasedByAgency || '');
    setReceivedByName(entry.receivedByName || '');
    setReceivedByRole(entry.receivedByRole || '');
    setReceivedByAgency(entry.receivedByAgency || '');
    
    if (COMMON_PURPOSES.includes(entry.purpose)) {
      setPurpose(entry.purpose);
      setCustomPurpose('');
    } else {
      setPurpose('Other');
      setCustomPurpose(entry.purpose);
    }
    
    setTransferLocation(entry.transferLocation || '');
    setPackagingCondition(entry.packagingCondition || '');
    setSigneeInitials(entry.signeeInitials || '');
    setShowFormModal(true);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedByName.trim()) {
      alert('Please specify the recipient name for chain of custody compliance.');
      return;
    }

    let signatureDataUrl: string | undefined = undefined;
    if (hasSignature && canvasRef.current) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    }

    const finalPurpose = purpose === 'Other' ? customPurpose : purpose;

    const entryData = {
      timestamp: new Date(timestamp).toISOString(),
      releasedByName: releasedByName.trim() || 'Undisclosed Custodian',
      releasedByRole: releasedByRole.trim() || 'Custodian',
      releasedByAgency: releasedByAgency.trim() || 'DFIR Unit',
      receivedByName: receivedByName.trim(),
      receivedByRole: receivedByRole.trim() || 'Custodian',
      receivedByAgency: receivedByAgency.trim() || 'DFIR Unit',
      purpose: finalPurpose,
      transferLocation: transferLocation.trim() || 'Forensics Laboratory',
      packagingCondition: packagingCondition.trim() || 'Intact',
      signatureDataUrl,
      signeeInitials: signeeInitials.trim() || 'AUTH',
      isExample: false, // Once submitted or edited, mark as non-example
    };

    if (editingEntryId && onUpdateEntry) {
      onUpdateEntry(editingEntryId, entryData);
    } else {
      onAddEntry(entryData);
    }

    // Reset & close
    setShowFormModal(false);
    setEditingEntryId(null);
    clearCanvas();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
      {/* Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-slate-100">
                Chain-of-Custody (CoC) Ledger
              </h2>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Append-Only
              </span>
              {hasAnyExample && (
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Entry #1 is Sample Demonstration Only
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Unbroken chronological record of evidence custody, transfers, packaging seals, and releases.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasAnyExample && onRemoveEntry && (
            <button
              type="button"
              onClick={() => {
                const ex = entries.find(isEntryExample);
                if (ex) onRemoveEntry(ex.id);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition"
              title="Remove sample entry #1 to start with a blank custody ledger"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-400" />
              Remove Sample Entry #1
            </button>
          )}

          <button
            id="btn-add-custody-entry"
            type="button"
            onClick={handleOpenAddForm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition shadow-sm active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Log Custody Transfer
          </button>
        </div>
      </div>

      {/* Ledger Timeline List */}
      <div className="p-5">
        {entries.length === 0 ? (
          <div className="py-8 text-center text-slate-500 space-y-2">
            <FileSignature className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-medium text-slate-400">No custody transfers logged yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Federal Rules of Evidence (FRE 901) & ISO 27037 mandate recording every custodian handoff. Click "Log Custody Transfer" above.
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-slate-800 ml-4 space-y-6">
            {entries.map((entry) => {
              const isSample = isEntryExample(entry);
              return (
                <div key={entry.id} className="relative pl-6 group">
                  {/* Timeline node icon */}
                  <div className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full bg-slate-900 border-2 ${isSample ? 'border-amber-500 text-amber-400 ring-2 ring-amber-500/20' : 'border-cyan-500/60 text-cyan-400'} flex items-center justify-center font-mono text-xs font-bold shadow-sm`}>
                    #{entry.sequenceNumber}
                  </div>

                  <div className={`rounded-xl p-4 space-y-3 transition border ${isSample ? 'bg-slate-950/80 border-amber-500/40 hover:border-amber-500/60 shadow-lg shadow-amber-950/20' : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'}`}>
                    
                    {/* Visual Callout for Example Entry #1 */}
                    {isSample && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200/95 space-y-2.5">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-amber-300">
                                Illustrative Example / Template Entry Only
                              </span>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/40">
                                Sample Record
                              </span>
                            </div>
                            <p className="text-amber-200/80 text-[11px] leading-relaxed">
                              These details (SecOps Incident Response Team, Agent J. Reynolds, Tamper Tape #TT-9104) are pre-filled <strong>strictly as an example</strong> to demonstrate how an ISO/IEC 27037 compliant intake record looks. Replace them with your actual case handover or remove this entry before court filing.
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(entry)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 transition shadow-sm active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Customize / Replace With Real Handoff
                          </button>
                          {onRemoveEntry && (
                            <button
                              type="button"
                              onClick={() => onRemoveEntry(entry.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove Example Entry
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Top row: Timestamp & Purpose & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">
                          {entry.purpose}
                        </span>
                        {isSample && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            [EXAMPLE]
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-xs font-mono text-cyan-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(entry)}
                            title={isSample ? 'Customize example entry' : 'Edit entry'}
                            className="p-1.5 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {onRemoveEntry && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Delete custody transfer entry #${entry.sequenceNumber}?`)) {
                                  onRemoveEntry(entry.id);
                                }
                              }}
                              title="Delete entry"
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Custodian Handoff: Released -> Received */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Released By */}
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                          Relinquished By
                        </span>
                        <p className="font-semibold text-slate-200">
                          {entry.releasedByName}
                        </p>
                        <p className="text-slate-400 text-[11px]">
                          {entry.releasedByRole} • {entry.releasedByAgency}
                        </p>
                      </div>

                      {/* Received By */}
                      <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400 block mb-1">
                          Received By
                        </span>
                        <p className="font-semibold text-slate-200">
                          {entry.receivedByName}
                        </p>
                        <p className="text-slate-400 text-[11px]">
                          {entry.receivedByRole} • {entry.receivedByAgency}
                        </p>
                      </div>
                    </div>

                    {/* Transfer Details & Seal Condition */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs text-slate-300">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block">Location</span>
                          <span>{entry.transferLocation}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Package className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block">Packaging & Seal State</span>
                          <span className="font-mono text-[11px] text-emerald-400/90">{entry.packagingCondition}</span>
                        </div>
                      </div>
                    </div>

                    {/* Signature / Initials block */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Signee Initials:</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono font-bold text-xs border border-slate-700">
                          {entry.signeeInitials}
                        </span>
                      </div>

                      {entry.signatureDataUrl ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 uppercase">Electronic Signature:</span>
                          <img
                            src={entry.signatureDataUrl}
                            alt="Digital Signature"
                            className="h-7 max-w-[140px] bg-slate-900 px-2 rounded border border-slate-800 object-contain"
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono">
                          Electronic record validated
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Entry Modal Form */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-semibold text-slate-100">
                  {editingEntryId
                    ? `Update Custody Transfer Record`
                    : `Record Chain-of-Custody Handoff (#${entries.length + 1})`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowFormModal(false);
                  setEditingEntryId(null);
                }}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Notice & Quick Clear */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                <span>Fillable Transfer Record — Complete details for this custody transfer.</span>
              </div>
              <button
                type="button"
                onClick={handleClearModalForm}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
              >
                Clear Form Inputs
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Date & Time */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="input-coc-time" className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    Transfer Timestamp
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fillTime('UTC')}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono border border-slate-700"
                    >
                      Now (UTC)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillTime('Local')}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono border border-slate-700"
                    >
                      Local
                    </button>
                  </div>
                </div>
                <input
                  id="input-coc-time"
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {/* Released By */}
              <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    1. Released By (Current Custodian)
                  </span>
                  {releasedByName && (releasedByName.toLowerCase().includes('reynolds') || releasedByName.toLowerCase().includes('secops')) && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        Sample Examiner Pre-filled
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setReleasedByName('');
                          setReleasedByRole('');
                          setReleasedByAgency('');
                        }}
                        className="text-[10px] text-slate-400 hover:text-white underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={releasedByName}
                    onChange={(e) => setReleasedByName(e.target.value)}
                    placeholder="Full Name (e.g. Inv. Jane Doe)"
                    required
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    value={releasedByRole}
                    onChange={(e) => setReleasedByRole(e.target.value)}
                    placeholder="Title / Badge # (e.g. DFIR-402)"
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    value={releasedByAgency}
                    onChange={(e) => setReleasedByAgency(e.target.value)}
                    placeholder="Agency / Department"
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Received By */}
              <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">
                  2. Received By (Next Custodian)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={receivedByName}
                    onChange={(e) => setReceivedByName(e.target.value)}
                    placeholder="Full Name (e.g. Sgt. M. Chen) *"
                    required
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    value={receivedByRole}
                    onChange={(e) => setReceivedByRole(e.target.value)}
                    placeholder="Title / Badge # (e.g. Lead Examiner)"
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    value={receivedByAgency}
                    onChange={(e) => setReceivedByAgency(e.target.value)}
                    placeholder="Agency / Department"
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label htmlFor="select-transfer-purpose" className="block text-xs font-medium text-slate-300 mb-1">
                  Purpose of Transfer
                </label>
                <select
                  id="select-transfer-purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  {COMMON_PURPOSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="Other">Other / Custom Purpose</option>
                </select>
                {purpose === 'Other' && (
                  <input
                    type="text"
                    value={customPurpose}
                    onChange={(e) => setCustomPurpose(e.target.value)}
                    placeholder="Specify custom transfer purpose..."
                    className="mt-2 w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                )}
              </div>

              {/* Location & Packaging */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="input-transfer-loc" className="block text-xs font-medium text-slate-300">
                      Transfer Location / Secure Repository
                    </label>
                    {transferLocation && (
                      <button
                        type="button"
                        onClick={() => setTransferLocation('')}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    id="input-transfer-loc"
                    type="text"
                    value={transferLocation}
                    onChange={(e) => setTransferLocation(e.target.value)}
                    placeholder="e.g. Vault Safe #3, DFIR Intake Lab"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  {/* Quick-fill helpers */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-[10px] text-slate-400 py-0.5">Quick fill:</span>
                    {[
                      'Evidence Locker #1',
                      'DFIR Processing Lab',
                      'Secure Court Vault',
                    ].map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setTransferLocation(loc)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
                      >
                        + {loc}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="input-packaging-cond" className="block text-xs font-medium text-slate-300">
                      Packaging & Evidence Tape Condition
                    </label>
                    {packagingCondition && (
                      <button
                        type="button"
                        onClick={() => setPackagingCondition('')}
                        className="text-[10px] text-slate-400 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    id="input-packaging-cond"
                    type="text"
                    value={packagingCondition}
                    onChange={(e) => setPackagingCondition(e.target.value)}
                    placeholder="e.g. Anti-static pouch, tamper tape #TT-01 intact"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  {/* Quick-fill helpers */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className="text-[10px] text-slate-400 py-0.5">Quick fill:</span>
                    {[
                      'Sealed anti-static pouch; tape intact',
                      'Faraday bag sealed; seal verified',
                      'Evidence box secured w/ tamper tape',
                    ].map((cond) => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setPackagingCondition(cond)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
                      >
                        + {cond}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Signature Canvas & Initials */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <FileSignature className="w-3.5 h-3.5 text-cyan-400" />
                    Digital Signature or Drawn Sign-Off (Optional Canvas)
                  </label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <Eraser className="w-3 h-3" />
                    Clear Signature
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 border border-slate-800 rounded-lg bg-slate-950 overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={90}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-[90px] cursor-crosshair touch-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="input-signee-initials" className="block text-xs font-medium text-slate-300 mb-1">
                      Signee Initials *
                    </label>
                    <input
                      id="input-signee-initials"
                      type="text"
                      maxLength={6}
                      value={signeeInitials}
                      onChange={(e) => setSigneeInitials(e.target.value.toUpperCase())}
                      placeholder="e.g. RM"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-cyan-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Cryptographically binds the handoff record to custody ledger.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowFormModal(false);
                    setEditingEntryId(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-add-custody"
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition"
                >
                  {editingEntryId ? 'Save Changes' : 'Commit Entry to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

