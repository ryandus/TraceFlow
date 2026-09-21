import React, { useState } from 'react';
import { 
  Download, 
  Printer, 
  FileCode, 
  FileSpreadsheet, 
  FileText, 
  Copy, 
  Check, 
  ShieldCheck, 
  ExternalLink 
} from 'lucide-react';
import { ManifestSession } from '../types/forensic';
import { generateManifestJSON, generateEvidenceCSV, downloadFile } from '../services/exporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ManifestSession;
  onTriggerPrint: () => void;
}

type TabType = 'pdf' | 'json' | 'csv' | 'checksums';

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  session,
  onTriggerPrint,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('pdf');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const jsonContent = generateManifestJSON(session);
  const csvContent = generateEvidenceCSV(session);

  const sha256ChecksumLines = session.files
    .map((f) => `${f.sha256 || 'PENDING_CALCULATION'}  ${f.name}`)
    .join('\n');

  const baseFileName = `${session.metadata.caseNumber || 'CASE'}_${session.metadata.evidenceItemNumber || 'ITEM'}`.replace(/[^a-zA-Z0-9_-]/g, '_');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadJSON = () => {
    downloadFile(jsonContent, `${baseFileName}_manifest.json`, 'application/json');
  };

  const handleDownloadCSV = () => {
    downloadFile(csvContent, `${baseFileName}_manifest.csv`, 'text/csv;charset=utf-8;');
  };

  const handleDownloadChecksums = () => {
    downloadFile(sha256ChecksumLines, `${baseFileName}_checksums.sha256`, 'text/plain;charset=utf-8;');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full flex flex-col max-h-[90vh] shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                Export Evidence Manifest & Reports
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  ISO/IEC 27037 Compliant
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Choose format for legal court submission, machine verification, or eDiscovery ingestion.
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

        {/* Tab Selection */}
        <div className="px-5 border-b border-slate-800 bg-slate-950/50 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'pdf'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            Printable Legal Manifest (PDF)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'json'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Raw Verification JSON (Cryptographic)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'csv'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            eDiscovery Table (CSV)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('checksums')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === 'checksums'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            CLI Checksums (.sha256)
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Tab 1: PDF / Print Manifest */}
          {activeTab === 'pdf' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Printable Legal Evidence Manifest & Physical Sign-Off
                  </h3>
                  <p className="text-xs text-slate-400 max-w-xl mt-0.5">
                    Generates a formal forensic evidence docket tailored to standard Letter / A4 paper. Includes chain-of-custody transfer logs, dual-hash integrity tables, examiner credentials, and formal physical signature lines.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onTriggerPrint();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition shadow-md shadow-cyan-500/20 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save as PDF
                </button>
              </div>

              {/* Quick preview card */}
              <div className="border border-slate-800 rounded-xl p-6 bg-slate-950/80 font-mono text-xs space-y-3">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-slate-300">DOCUMENT SPECIFICATION</span>
                  <span className="text-cyan-400">ISO/IEC 27037:2012</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div>Case ID: <strong className="text-slate-200">{session.metadata.caseNumber || 'N/A'}</strong></div>
                  <div>Exhibit #: <strong className="text-slate-200">{session.metadata.evidenceItemNumber || 'N/A'}</strong></div>
                  <div>Lead Examiner: <strong className="text-slate-200">{session.metadata.examinerName || 'N/A'}</strong></div>
                  <div>Evidence Files: <strong className="text-slate-200">{session.files.length} items</strong></div>
                  <div>Transfer Ledger: <strong className="text-slate-200">{session.custodyLedger.length} handoffs</strong></div>
                  <div>Integrity Sign-off: <strong className="text-slate-200">Physical & Electronic</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: JSON */}
          {activeTab === 'json' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Self-contained cryptographic manifest schema with ISO 8601 timestamps, full SHA-256 and MD5 hashes, and custody history.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(jsonContent)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy JSON'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadJSON}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .json</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 overflow-x-auto max-h-[350px] selection:bg-cyan-500/20">
                {jsonContent}
              </pre>
            </div>
          )}

          {/* Tab 3: CSV */}
          {activeTab === 'csv' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Standard RFC 4180 CSV export formatted for evidence inventories, litigation binders, and eDiscovery databases.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(csvContent)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy CSV'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .csv</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 overflow-x-auto max-h-[350px]">
                {csvContent}
              </pre>
            </div>
          )}

          {/* Tab 4: Checksums */}
          {activeTab === 'checksums' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Compatible with UNIX GNU Coreutils command: <code className="text-cyan-300">sha256sum -c</code>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(sha256ChecksumLines)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy Text'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadChecksums}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .sha256</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 overflow-x-auto max-h-[350px]">
                {sha256ChecksumLines || '# No files in manifest yet'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
