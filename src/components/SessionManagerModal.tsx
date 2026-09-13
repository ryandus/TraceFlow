import React, { useState } from 'react';
import { 
  FolderClock, 
  Copy, 
  Trash2, 
  FileCheck2, 
  Calendar, 
  HardDrive, 
  ShieldCheck, 
  Download, 
  Plus, 
  Search, 
  ArrowRight,
  Database
} from 'lucide-react';
import { ManifestSession } from '../types/forensic';
import { formatBytes } from '../services/hasher';

interface SessionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ManifestSession[];
  currentSessionId: string;
  onResumeSession: (sessionId: string) => void;
  onDuplicateSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewSession: () => void;
  onExportAllBackup: () => void;
}

export const SessionManagerModal: React.FC<SessionManagerModalProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onResumeSession,
  onDuplicateSession,
  onDeleteSession,
  onNewSession,
  onExportAllBackup,
}) => {
  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    const term = search.toLowerCase();
    return (
      (s.metadata.caseNumber && s.metadata.caseNumber.toLowerCase().includes(term)) ||
      (s.metadata.evidenceItemNumber && s.metadata.evidenceItemNumber.toLowerCase().includes(term)) ||
      (s.metadata.examinerName && s.metadata.examinerName.toLowerCase().includes(term)) ||
      (s.metadata.agencyOrganization && s.metadata.agencyOrganization.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <FolderClock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Local Evidence Manifest Vault
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  IndexedDB
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Persistent local storage. Switch between ongoing investigations, clone exhibits, or export backups.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-base font-bold"
          >
            ✕
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by Case #, Evidence Item #, Examiner..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onExportAllBackup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
              title="Download full JSON archive of all saved case manifests"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Backup All
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onNewSession();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              New Manifest
            </button>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Database className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-sm font-medium text-slate-400">No saved sessions match search</p>
              <p className="text-xs text-slate-500">
                Manifests are automatically committed to your browser's IndexedDB as you enter details.
              </p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isCurrent = session.id === currentSessionId;
              const totalSize = session.files.reduce((a, b) => a + (b.sizeBytes || 0), 0);
              const verifiedCount = session.files.filter((f) => f.verificationStatus === 'match').length;
              const mismatchCount = session.files.filter((f) => f.verificationStatus === 'mismatch').length;

              return (
                <div
                  key={session.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-cyan-950/15 border-cyan-500/50 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Left: Case Info */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold font-mono text-slate-100">
                          {session.metadata.caseNumber || 'UNTITLED CASE'}
                        </span>
                        <span className="text-xs font-semibold font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                          {session.metadata.evidenceItemNumber || 'ITEM-001'}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold uppercase tracking-wider font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Active Session
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400">
                        {session.metadata.examinerName ? `Examiner: ${session.metadata.examinerName}` : 'No examiner designated'} 
                        {session.metadata.agencyOrganization ? ` • ${session.metadata.agencyOrganization}` : ''}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-cyan-400" />
                          {session.files.length} {session.files.length === 1 ? 'file' : 'files'} ({formatBytes(totalSize)})
                        </span>

                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          Saved: {new Date(session.lastSavedAt).toLocaleString()}
                        </span>

                        {verifiedCount > 0 && (
                          <span className="text-emerald-400 font-semibold">
                            ✓ {verifiedCount} verified
                          </span>
                        )}

                        {mismatchCount > 0 && (
                          <span className="text-rose-400 font-semibold">
                            ⚠ {mismatchCount} mismatch
                          </span>
                        )}

                        <span>
                          {session.custodyLedger.length} CoC handoffs
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => {
                            onResumeSession(session.id);
                            onClose();
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition active:scale-95"
                        >
                          <span>Resume</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onDuplicateSession(session.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                        title="Duplicate as new sub-exhibit / manifest clone"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {deleteConfirmId === session.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteSession(session.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2 py-1 text-[10px] font-bold rounded bg-rose-600 text-white hover:bg-rose-500 transition"
                          >
                            Confirm Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 text-[10px] rounded bg-slate-800 text-slate-400 hover:text-slate-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(session.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Delete session"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>{sessions.length} total manifest drafts stored locally in IndexedDB</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
};
