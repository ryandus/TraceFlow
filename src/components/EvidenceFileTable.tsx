import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Trash2, 
  Search, 
  Filter, 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle, 
  FileCode, 
  HardDrive, 
  FileText,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { EvidenceFile, HashVerificationStatus } from '../types/forensic';
import { formatBytes } from '../services/hasher';

interface EvidenceFileTableProps {
  files: EvidenceFile[];
  onUpdateExpectedHash: (fileId: string, expectedHash: string) => void;
  onRemoveFile: (fileId: string) => void;
  onClearFiles: () => void;
  onBulkVerifyPaste: (pastedText: string) => void;
}

export const EvidenceFileTable: React.FC<EvidenceFileTableProps> = ({
  files,
  onUpdateExpectedHash,
  onRemoveFile,
  onClearFiles,
  onBulkVerifyPaste,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'mismatch' | 'unverified'>('all');
  const [copiedHashKey, setCopiedHashKey] = useState<string | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInputText, setBulkInputText] = useState('');

  const handleCopy = (text: string, key: string) => {
    if (!text || text === 'PENDING') return;
    navigator.clipboard.writeText(text);
    setCopiedHashKey(key);
    setTimeout(() => setCopiedHashKey(null), 2000);
  };

  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.sha256.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.md5.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.relativePath && file.relativePath.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'verified') return file.verificationStatus === 'match';
    if (statusFilter === 'mismatch') return file.verificationStatus === 'mismatch';
    if (statusFilter === 'unverified') return file.verificationStatus === 'unverified';
    return true;
  });

  const verifiedCount = files.filter((f) => f.verificationStatus === 'match').length;
  const mismatchCount = files.filter((f) => f.verificationStatus === 'mismatch').length;
  const totalCount = files.length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md space-y-0">
      {/* Table Header Controls */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-100">
                Evidence Files & Cryptographic Hashes
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {totalCount} {totalCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Verify integrity against baseline checksums or pre-acquisition evidence logs.
            </p>
          </div>
        </div>

        {/* Action badges & Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick status counters */}
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              {verifiedCount} Verified
            </span>
            {mismatchCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse font-bold">
                <ShieldAlert className="w-3.5 h-3.5" />
                {mismatchCount} Mismatch!
              </span>
            )}
          </div>

          <button
            id="btn-bulk-verify"
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title="Paste md5sum / sha256sum list to batch verify"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Bulk Verify List
          </button>

          {files.length > 0 && (
            <button
              id="btn-clear-files"
              type="button"
              onClick={onClearFiles}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
              title="Clear all files from manifest"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="px-4 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filename, relative path, SHA-256, or MD5..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
            {(['all', 'verified', 'mismatch', 'unverified'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition ${
                  statusFilter === filter
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Files Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              <th className="py-2.5 px-3 w-10 text-center">#</th>
              <th className="py-2.5 px-3 min-w-[200px]">File Name & Details</th>
              <th className="py-2.5 px-3 w-28">Size</th>
              <th className="py-2.5 px-3 min-w-[280px]">SHA-256 Digest</th>
              <th className="py-2.5 px-3 min-w-[240px]">MD5 Digest</th>
              <th className="py-2.5 px-3 min-w-[240px]">Integrity Verification</th>
              <th className="py-2.5 px-2 w-12 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {filteredFiles.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="max-w-sm mx-auto space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-sm font-medium text-slate-400">No evidence items match filter</p>
                    <p className="text-xs text-slate-500">
                      Drag and drop evidence files or click "Load Forensic Sample Data" above.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredFiles.map((file, index) => {
                const isMatch = file.verificationStatus === 'match';
                const isMismatch = file.verificationStatus === 'mismatch';

                return (
                  <tr
                    key={file.id}
                    className={`transition-colors hover:bg-slate-800/30 ${
                      isMismatch ? 'bg-rose-950/15' : isMatch ? 'bg-emerald-950/10' : ''
                    }`}
                  >
                    {/* Index */}
                    <td className="py-3 px-3 text-center text-slate-500 font-mono text-[11px]">
                      {index + 1}
                    </td>

                    {/* File Info */}
                    <td className="py-3 px-3">
                      <div className="flex items-start gap-2">
                        <div className="p-1 rounded bg-slate-800 text-slate-400 shrink-0 mt-0.5">
                          <FileCode className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-200 font-mono break-all text-xs">
                            {file.name}
                          </p>
                          {file.relativePath && file.relativePath !== file.name && (
                            <p className="text-[10px] text-slate-500 font-mono truncate max-w-xs">
                              {file.relativePath}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-mono">
                              {file.mimeType || 'binary/raw'}
                            </span>
                            {file.sizeBytes === 0 && (
                              <span className="px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono font-bold">
                                0-BYTE EMPTY FILE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Size */}
                    <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                      {formatBytes(file.sizeBytes)}
                      <span className="block text-[10px] text-slate-500">
                        {file.sizeBytes.toLocaleString()} B
                      </span>
                    </td>

                    {/* SHA-256 */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1 group">
                          <span
                            className={`font-mono text-[11px] break-all leading-tight select-all ${
                              isMatch && file.expectedHash?.toLowerCase() === file.sha256.toLowerCase()
                                ? 'text-emerald-400 font-bold'
                                : 'text-slate-300'
                            }`}
                          >
                            {file.sha256}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(file.sha256, `${file.id}-sha256`)}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition opacity-70 group-hover:opacity-100 shrink-0"
                            title="Copy full SHA-256 digest"
                          >
                            {copiedHashKey === `${file.id}-sha256` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* MD5 */}
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1 group">
                          <span
                            className={`font-mono text-[11px] break-all leading-tight select-all ${
                              isMatch && file.expectedHash?.toLowerCase() === file.md5.toLowerCase()
                                ? 'text-emerald-400 font-bold'
                                : 'text-slate-400'
                            }`}
                          >
                            {file.md5}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(file.md5, `${file.id}-md5`)}
                            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition opacity-70 group-hover:opacity-100 shrink-0"
                            title="Copy full MD5 digest"
                          >
                            {copiedHashKey === `${file.id}-md5` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Hash Verification Status & Input */}
                    <td className="py-3 px-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          {isMatch && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <ShieldCheck className="w-3 h-3" />
                              VERIFIED MATCH
                            </span>
                          )}

                          {isMismatch && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              <ShieldAlert className="w-3 h-3" />
                              HASH MISMATCH
                            </span>
                          )}

                          {file.verificationStatus === 'unverified' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-slate-500 bg-slate-800/60 border border-slate-700/50">
                              Unverified
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type="text"
                            value={file.expectedHash || ''}
                            onChange={(e) => onUpdateExpectedHash(file.id, e.target.value.trim())}
                            placeholder="Paste expected MD5/SHA-256..."
                            className={`w-full px-2 py-1 text-[11px] font-mono rounded bg-slate-950 border placeholder-slate-600 focus:outline-none transition ${
                              isMatch
                                ? 'border-emerald-500/50 text-emerald-200'
                                : isMismatch
                                ? 'border-rose-500/60 text-rose-200 focus:border-rose-500'
                                : 'border-slate-800 text-slate-300 focus:border-cyan-500'
                            }`}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveFile(file.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                        title="Remove evidence item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Verify Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Bulk Hash Verification Import
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Paste standard checksum output lines (e.g. from <code className="text-cyan-300">sha256sum</code> or <code className="text-cyan-300">md5sum</code>), or a list of raw hashes. The engine will match by digest and verify your evidence table automatically.
            </p>

            <textarea
              rows={6}
              value={bulkInputText}
              onChange={(e) => setBulkInputText(e.target.value)}
              placeholder={`e.g.:\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  empty.txt\n2b3506161ca125d742afc83c078b40be774d0ef7fa7ba6c0ce84b3f12b6fbe14  evidence.001`}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-400 hover:text-slate-200 bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onBulkVerifyPaste(bulkInputText);
                  setShowBulkModal(false);
                  setBulkInputText('');
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition"
              >
                Apply Verification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
