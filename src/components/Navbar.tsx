import React from 'react';
import { 
  ShieldCheck, 
  Database, 
  FolderClock, 
  PlusCircle, 
  Download, 
  Printer, 
  Sun, 
  Moon,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface NavbarProps {
  caseNumber: string;
  evidenceItemNumber: string;
  lastSavedAt: string | null;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  savedSessionsCount: number;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onOpenSessionManager: () => void;
  onNewManifest: () => void;
  onOpenExport: () => void;
  onPrint: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  caseNumber,
  evidenceItemNumber,
  lastSavedAt,
  isSaving,
  hasUnsavedChanges,
  savedSessionsCount,
  isDarkMode,
  onToggleTheme,
  onOpenSessionManager,
  onNewManifest,
  onOpenExport,
  onPrint,
}) => {
  const formatSavedTime = (isoString: string | null) => {
    if (!isoString) return 'Not yet saved';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' UTC';
    } catch {
      return 'Recently';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur transition-colors no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Case Tag */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-sm shadow-cyan-500/10">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-100 truncate flex items-center gap-1.5">
                TraceFlow
              </h1>
              <span className="text-[11px] font-mono text-cyan-400 hidden lg:inline-block">
                Custody & Hash Manifest Engine
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                ISO/IEC 27037
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono truncate">
              <span>{caseNumber || 'UNTITLED CASE'}</span>
              <span>•</span>
              <span className="text-cyan-400 font-medium">{evidenceItemNumber || 'ITEM-001'}</span>
            </div>
          </div>
        </div>

        {/* Center: Persistence Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs">
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span className="text-slate-300">Saving to IndexedDB...</span>
            </>
          ) : hasUnsavedChanges ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300">Unsaved edits (auto-saving...)</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-400 font-mono text-[11px]">
                Saved locally: <strong className="text-slate-200">{formatSavedTime(lastSavedAt)}</strong>
              </span>
              <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                IndexedDB
              </span>
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* New Manifest */}
          <button
            id="btn-new-manifest"
            type="button"
            onClick={onNewManifest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition shadow-sm active:scale-95"
            title="Start a new blank manifest session"
          >
            <PlusCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">New Manifest</span>
          </button>

          {/* Saved Sessions Drawer Button */}
          <button
            id="btn-session-manager"
            type="button"
            onClick={onOpenSessionManager}
            className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition shadow-sm active:scale-95"
            title="Open past stored evidence manifests in IndexedDB"
          >
            <FolderClock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Sessions</span>
            {savedSessionsCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-cyan-500 text-slate-950 font-mono ml-0.5">
                {savedSessionsCount}
              </span>
            )}
          </button>

          {/* Print Manifest directly */}
          <button
            id="btn-print-manifest"
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-600 transition shadow-sm active:scale-95"
            title="Print or Save as PDF with forensic formatting"
          >
            <Printer className="w-3.5 h-3.5 text-slate-300" />
            <span className="hidden md:inline">Print / PDF</span>
          </button>

          {/* Export Hub */}
          <button
            id="btn-export-hub"
            type="button"
            onClick={onOpenExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition shadow-md shadow-cyan-500/20 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Manifest</span>
          </button>

          {/* Theme Toggle */}
          <button
            id="btn-toggle-theme"
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            title={isDarkMode ? 'Switch to High-Contrast Light Mode' : 'Switch to Forensics Dark Mode'}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>
    </header>
  );
};
