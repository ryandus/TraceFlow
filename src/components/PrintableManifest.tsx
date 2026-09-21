import React, { useState, useEffect } from 'react';
import { ManifestSession } from '../types/forensic';
import { formatBytes } from '../services/hasher';
import { generateManifestHashQR, ManifestAuditQRResult } from '../services/qrAudit';

interface PrintableManifestProps {
  session: ManifestSession;
  qrAuditData?: ManifestAuditQRResult | null;
}

export const PrintableManifest: React.FC<PrintableManifestProps> = ({ session, qrAuditData }) => {
  const { metadata, files, custodyLedger } = session;
  const [auditQR, setAuditQR] = useState<ManifestAuditQRResult | null>(qrAuditData || null);

  useEffect(() => {
    if (qrAuditData) {
      setAuditQR(qrAuditData);
    } else {
      generateManifestHashQR(session).then((res) => {
        setAuditQR(res);
      });
    }
  }, [session, qrAuditData]);

  const verifiedCount = files.filter((f) => f.verificationStatus === 'match').length;
  const mismatchCount = files.filter((f) => f.verificationStatus === 'mismatch').length;
  const pendingCount = files.filter((f) => !f.sha256 || f.hashingStatus !== 'completed').length;
  const totalSizeBytes = files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);

  return (
    <div className="print-only text-black bg-white p-4 font-sans text-[10pt] leading-normal">
      {/* Official Header */}
      <div className="border-b-2 border-black pb-3 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight text-black">
              Digital Evidence Integrity & Chain-of-Custody Manifest
            </h1>
            <p className="text-xs font-semibold tracking-wide text-gray-700 uppercase mt-0.5">
              ISO/IEC 27037:2012 COMPLIANT • DIGITAL FORENSICS & INCIDENT RESPONSE (DFIR)
            </p>
            <p className="text-xs text-gray-600">
              Agency: <strong>{metadata.agencyOrganization || 'Forensics Investigation Division'}</strong>
            </p>
          </div>
          <div className="text-right text-xs font-mono">
            <div>CASE: <strong>{metadata.caseNumber || 'UNTITLED'}</strong></div>
            <div>EXHIBIT: <strong>{metadata.evidenceItemNumber || 'ITEM-001'}</strong></div>
            <div>DATE: {new Date().toISOString().slice(0, 10)}</div>
          </div>
        </div>
      </div>

      {/* Case Header Details Grid */}
      <div className="mb-4 border border-gray-400 p-3 rounded text-xs page-break-inside-avoid">
        <h2 className="font-bold text-black uppercase tracking-wider mb-2 border-b border-gray-300 pb-1">
          1. Case & Acquisition Parameters (ISO/IEC 27037)
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          <div>
            <span className="text-gray-600 font-semibold">Case Number:</span>{' '}
            <strong className="font-mono">{metadata.caseNumber || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-gray-600 font-semibold">Evidence Item #:</span>{' '}
            <strong className="font-mono">{metadata.evidenceItemNumber || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-gray-600 font-semibold">Lead Examiner:</span>{' '}
            {metadata.examinerName || 'N/A'} ({metadata.examinerBadgeId || 'ID Unspecified'})
          </div>
          <div>
            <span className="text-gray-600 font-semibold">Organization:</span>{' '}
            {metadata.agencyOrganization || 'N/A'}
          </div>
          <div>
            <span className="text-gray-600 font-semibold">Source Acquisition Method:</span>{' '}
            <strong>{metadata.sourceAcquisitionMethod}</strong>
          </div>
          <div>
            <span className="text-gray-600 font-semibold">Source Drive / Media Type:</span>{' '}
            {metadata.mediaType}
          </div>
          <div>
            <span className="text-gray-600 font-semibold">Write-Blocker Utilized:</span>{' '}
            <strong>{metadata.writeBlockerUsed}</strong>
          </div>
          <div>
            <span className="text-gray-600 font-semibold">Collection Date / Timestamp:</span>{' '}
            <span className="font-mono">{metadata.collectionDateTime || 'N/A'} ({metadata.collectionTimeZone})</span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600 font-semibold">Physical Location Found:</span>{' '}
            {metadata.locationFound || 'N/A'}
          </div>
          {metadata.notes && (
            <div className="col-span-2 text-gray-700 italic">
              <span className="text-gray-600 font-semibold not-italic">Examiner Ingestion Notes:</span>{' '}
              {metadata.notes}
            </div>
          )}
        </div>
      </div>

      {/* Files Manifest Table */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <h2 className="font-bold text-xs text-black uppercase tracking-wider">
            2. Cryptographic Hash Integrity Manifest ({files.length} items • {formatBytes(totalSizeBytes)})
          </h2>
          <div className="text-[9pt] font-mono">
            Status: <strong>{verifiedCount} Verified</strong>
            {mismatchCount > 0 && <span className="text-red-700 font-bold ml-2">({mismatchCount} MISMATCHES FLAGGED)</span>}
            {pendingCount > 0 && <span className="text-amber-700 font-bold ml-2">({pendingCount} INCOMPLETE / PENDING CALCULATION)</span>}
          </div>
        </div>

        <table className="w-full text-left text-[8pt] border border-collapse border-gray-400">
          <thead>
            <tr className="bg-gray-200 text-black font-bold">
              <th className="border border-gray-400 p-1 w-8 text-center">#</th>
              <th className="border border-gray-400 p-1">File Name & Path</th>
              <th className="border border-gray-400 p-1 w-20">Size</th>
              <th className="border border-gray-400 p-1">SHA-256 Digest</th>
              <th className="border border-gray-400 p-1 w-48">MD5 Digest</th>
              <th className="border border-gray-400 p-1 w-20 text-center">Audit Status</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, idx) => (
              <tr key={file.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border border-gray-400 p-1 text-center font-mono">{idx + 1}</td>
                <td className="border border-gray-400 p-1 font-mono">
                  <strong>{file.name}</strong>
                  {file.relativePath && file.relativePath !== file.name && (
                    <div className="text-[7pt] text-gray-600">{file.relativePath}</div>
                  )}
                </td>
                <td className="border border-gray-400 p-1 font-mono whitespace-nowrap">
                  {formatBytes(file.sizeBytes)}
                </td>
                <td className="border border-gray-400 p-1 font-mono text-[7pt] break-all">
                  {file.sha256 ? (
                    file.sha256
                  ) : (
                    <span className="text-amber-800 font-bold uppercase tracking-wider">PENDING CALCULATION</span>
                  )}
                </td>
                <td className="border border-gray-400 p-1 font-mono text-[7pt] break-all">
                  {file.md5 ? (
                    file.md5
                  ) : (
                    <span className="text-amber-800 font-bold uppercase tracking-wider">PENDING CALCULATION</span>
                  )}
                </td>
                <td className="border border-gray-400 p-1 text-center font-bold text-[7pt]">
                  {file.verificationStatus === 'match' ? (
                    <span className="text-green-800">MATCH ✓</span>
                  ) : file.verificationStatus === 'mismatch' ? (
                    <span className="text-red-700">MISMATCH ⚠</span>
                  ) : !file.sha256 ? (
                    <span className="text-amber-800">INCOMPLETE</span>
                  ) : (
                    <span className="text-gray-600">Unverified</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Chain-of-Custody Ledger */}
      <div className="mb-4 page-break-inside-avoid">
        <h2 className="font-bold text-xs text-black uppercase tracking-wider mb-1.5">
          3. Chain-of-Custody (CoC) Chronological Transfer Ledger
        </h2>

        {custodyLedger.length === 0 ? (
          <p className="text-xs text-gray-600 italic border border-gray-300 p-2">
            No custody transfers recorded prior to this generation.
          </p>
        ) : (
          <table className="w-full text-left text-[8pt] border border-collapse border-gray-400">
            <thead>
              <tr className="bg-gray-200 text-black font-bold">
                <th className="border border-gray-400 p-1 w-6 text-center">#</th>
                <th className="border border-gray-400 p-1 w-24">Date/Time (UTC)</th>
                <th className="border border-gray-400 p-1">Released By</th>
                <th className="border border-gray-400 p-1">Received By</th>
                <th className="border border-gray-400 p-1">Purpose & Location</th>
                <th className="border border-gray-400 p-1">Packaging / Seal Condition</th>
                <th className="border border-gray-400 p-1 w-14 text-center">Initials</th>
              </tr>
            </thead>
            <tbody>
              {custodyLedger.map((entry) => (
                <tr key={entry.id} className="bg-white">
                  <td className="border border-gray-400 p-1 text-center font-mono font-bold">
                    {entry.sequenceNumber}
                  </td>
                  <td className="border border-gray-400 p-1 font-mono text-[7pt]">
                    {entry.timestamp}
                  </td>
                  <td className="border border-gray-400 p-1">
                    <strong>{entry.releasedByName}</strong>
                    <div className="text-[7pt] text-gray-600">{entry.releasedByRole} • {entry.releasedByAgency}</div>
                  </td>
                  <td className="border border-gray-400 p-1">
                    <strong>{entry.receivedByName}</strong>
                    <div className="text-[7pt] text-gray-600">{entry.receivedByRole} • {entry.receivedByAgency}</div>
                  </td>
                  <td className="border border-gray-400 p-1">
                    <strong>{entry.purpose}</strong>
                    <div className="text-[7pt] text-gray-600">{entry.transferLocation}</div>
                  </td>
                  <td className="border border-gray-400 p-1 text-[7pt]">
                    {entry.packagingCondition}
                  </td>
                  <td className="border border-gray-400 p-1 text-center font-mono font-bold">
                    {entry.signeeInitials}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Formal Certification Block & Signatures */}
      <div className="border border-black p-3 mt-4 text-xs page-break-inside-avoid">
        <h3 className="font-bold text-black uppercase text-[9pt] mb-1">
          4. Forensic Examiner Attestation & Legal Certification
        </h3>
        <p className="text-[8pt] text-gray-700 leading-tight mb-4">
          I hereby certify under penalty of law that the digital evidence items specified in this manifest were acquired, cataloged, and handled in compliance with ISO/IEC 27037 standards for digital evidence handling. The SHA-256 and MD5 cryptographic digests recorded herein reflect the true bit-level integrity of the files at the time of calculation, and the chain of custody recorded is unbroken and accurate.
        </p>

        <div className="grid grid-cols-2 gap-8 pt-4">
          <div>
            <div className="border-b border-black pb-1 mb-1">
              <span className="font-mono text-xs">{metadata.examinerName || '___________________________'}</span>
            </div>
            <p className="text-[8pt] text-gray-600 uppercase font-semibold">Lead Examiner Signature & Badge #</p>
          </div>

          <div>
            <div className="border-b border-black pb-1 mb-1">
              <span className="font-mono text-xs">{new Date().toISOString().slice(0, 10)}</span>
            </div>
            <p className="text-[8pt] text-gray-600 uppercase font-semibold">Verification Date & Official Seal</p>
          </div>
        </div>
      </div>

      {/* 5. Audit Defensibility & Cryptographic QR Verification Block */}
      <div className="border border-black p-3 mt-4 text-xs bg-gray-50 page-break-inside-avoid">
        <h3 className="font-bold text-black uppercase text-[9pt] mb-2 flex items-center justify-between">
          <span>5. Audit Defensibility & Cryptographic Ledger Baseline</span>
          <span className="text-[7.5pt] font-mono font-normal">ISO/IEC 27037:2012 §8.4</span>
        </h3>

        <div className="flex items-center gap-4">
          {auditQR?.qrDataUrl ? (
            <img 
              src={auditQR.qrDataUrl} 
              alt="Cryptographic Audit QR Code" 
              className="w-24 h-24 border border-black p-1 bg-white shrink-0" 
            />
          ) : (
            <div className="w-24 h-24 border border-gray-400 flex items-center justify-center text-[7pt] text-gray-500 shrink-0">
              Generating QR...
            </div>
          )}

          <div className="space-y-1 min-w-0 text-[8pt] font-mono leading-relaxed">
            <div>
              <span className="text-gray-600">Manifest SHA-256 Fingerprint:</span>
              <div className="font-bold text-[7.5pt] break-all select-all text-black bg-white border border-gray-300 p-1 rounded">
                {auditQR?.manifestHash || 'Generating cryptographic baseline...'}
              </div>
            </div>
            <p className="text-[7pt] text-gray-600 font-sans leading-tight pt-1">
              This physical manifest contains an immutable cryptographic baseline digest. Scan the QR code with any standard camera or air-gapped forensic scanner to cross-examine digital records against this printed exhibit.
            </p>
          </div>
        </div>
      </div>

      {/* Official Watermark */}
      <div className="mt-4 pt-2 border-t border-gray-400 text-center text-[7.5pt] text-gray-500 font-mono">
        TraceFlow — ISO/IEC 27037 Digital Forensic Custody & Hash Manifest Engine
      </div>
    </div>
  );
};
