import { ManifestSession } from '../types/forensic';
import { formatBytes } from './hasher';

export interface ExportManifestJSON {
  $schema: string;
  complianceStandard: string;
  generator: string;
  exportTimestamp: string;
  session: {
    sessionId: string;
    version: string;
    createdTimestamp: string;
    lastSavedTimestamp: string;
  };
  caseMetadata: ManifestSession['metadata'];
  evidenceIntegrityManifest: {
    totalFilesCount: number;
    totalSizeBytes: number;
    totalSizeFormatted: string;
    verificationSummary: {
      verifiedCount: number;
      mismatchCount: number;
      unverifiedCount: number;
    };
    files: Array<{
      sequence: number;
      fileName: string;
      relativePath: string;
      fileSizeBytes: number;
      fileSizeFormatted: string;
      mimeType: string;
      lastModifiedTimestamp: string;
      cryptographicHashes: {
        sha256: string;
        md5: string;
      };
      verification: {
        expectedHashProvided: string | null;
        verificationStatus: string;
      };
      notes?: string;
    }>;
  };
  chainOfCustodyLedger: Array<{
    sequenceNumber: number;
    timestamp: string;
    releasedBy: {
      name: string;
      role: string;
      agency: string;
    };
    receivedBy: {
      name: string;
      role: string;
      agency: string;
    };
    transferPurpose: string;
    transferLocation: string;
    packagingAndCondition: string;
    signeeInitials: string;
    hasDigitalSignature: boolean;
  }>;
}

export function generateManifestJSON(session: ManifestSession): string {
  const verifiedCount = session.files.filter((f) => f.verificationStatus === 'match').length;
  const mismatchCount = session.files.filter((f) => f.verificationStatus === 'mismatch').length;
  const unverifiedCount = session.files.filter((f) => f.verificationStatus === 'unverified').length;
  const totalSizeBytes = session.files.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);

  const payload: ExportManifestJSON = {
    $schema: 'https://standards.iso.org/iso/27037/forensic-evidence-manifest.json',
    complianceStandard: 'ISO/IEC 27037:2012 - Digital Evidence Handling & Custody',
    generator: 'Forensic Hash & Chain-of-Custody Manifest Generator v1.0',
    exportTimestamp: new Date().toISOString(),
    session: {
      sessionId: session.id,
      version: session.version,
      createdTimestamp: session.createdAt,
      lastSavedTimestamp: session.lastSavedAt,
    },
    caseMetadata: session.metadata,
    evidenceIntegrityManifest: {
      totalFilesCount: session.files.length,
      totalSizeBytes,
      totalSizeFormatted: formatBytes(totalSizeBytes),
      verificationSummary: {
        verifiedCount,
        mismatchCount,
        unverifiedCount,
      },
      files: session.files.map((file, index) => ({
        sequence: index + 1,
        fileName: file.name,
        relativePath: file.relativePath || file.name,
        fileSizeBytes: file.sizeBytes,
        fileSizeFormatted: formatBytes(file.sizeBytes),
        mimeType: file.mimeType || 'application/octet-stream',
        lastModifiedTimestamp: file.lastModified ? new Date(file.lastModified).toISOString() : 'Unknown',
        cryptographicHashes: {
          sha256: file.sha256 || 'NOT_COMPUTED',
          md5: file.md5 || 'NOT_COMPUTED',
        },
        verification: {
          expectedHashProvided: file.expectedHash || null,
          verificationStatus: file.verificationStatus,
        },
        notes: file.notes || undefined,
      })),
    },
    chainOfCustodyLedger: session.custodyLedger.map((entry) => ({
      sequenceNumber: entry.sequenceNumber,
      timestamp: entry.timestamp,
      releasedBy: {
        name: entry.releasedByName,
        role: entry.releasedByRole,
        agency: entry.releasedByAgency,
      },
      receivedBy: {
        name: entry.receivedByName,
        role: entry.receivedByRole,
        agency: entry.receivedByAgency,
      },
      transferPurpose: entry.purpose,
      transferLocation: entry.transferLocation,
      packagingAndCondition: entry.packagingCondition,
      signeeInitials: entry.signeeInitials,
      hasDigitalSignature: !!entry.signatureDataUrl,
    })),
  };

  return JSON.stringify(payload, null, 2);
}

function escapeCSV(field: string | number | undefined | null): string {
  if (field === undefined || field === null) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

export function generateEvidenceCSV(session: ManifestSession): string {
  const lines: string[] = [];

  // Section 1: Case Details
  lines.push('# FORENSIC EVIDENCE MANIFEST - ISO/IEC 27037 COMPLIANT');
  lines.push(`Case Number,${escapeCSV(session.metadata.caseNumber)}`);
  lines.push(`Evidence Item #,${escapeCSV(session.metadata.evidenceItemNumber)}`);
  lines.push(`Examiner,${escapeCSV(session.metadata.examinerName)} (${escapeCSV(session.metadata.examinerBadgeId)})`);
  lines.push(`Agency / Organization,${escapeCSV(session.metadata.agencyOrganization)}`);
  lines.push(`Media / Source Drive,${escapeCSV(session.metadata.mediaType)}`);
  lines.push(`Serial Number,${escapeCSV(session.metadata.sourceSerialNumber)}`);
  lines.push(`Acquisition Method,${escapeCSV(session.metadata.sourceAcquisitionMethod)}`);
  lines.push(`Write Blocker Utilized,${escapeCSV(session.metadata.writeBlockerUsed)}`);
  lines.push(`Collection Timestamp,${escapeCSV(session.metadata.collectionDateTime)}`);
  lines.push(`Location Found,${escapeCSV(session.metadata.locationFound)}`);
  lines.push('');

  // Section 2: Files Integrity Table
  lines.push('# EVIDENCE FILE HASH MANIFEST');
  lines.push([
    'Seq',
    'File Name',
    'Relative Path',
    'Size (Bytes)',
    'Size Formatted',
    'MIME Type',
    'SHA-256 Digest',
    'MD5 Digest',
    'Expected Hash',
    'Integrity Status',
    'Notes',
  ].map(escapeCSV).join(','));

  session.files.forEach((file, index) => {
    lines.push([
      index + 1,
      file.name,
      file.relativePath || file.name,
      file.sizeBytes,
      formatBytes(file.sizeBytes),
      file.mimeType || 'application/octet-stream',
      file.sha256 || 'PENDING',
      file.md5 || 'PENDING',
      file.expectedHash || '',
      file.verificationStatus.toUpperCase(),
      file.notes || '',
    ].map(escapeCSV).join(','));
  });

  lines.push('');

  // Section 3: Chain of Custody Ledger
  lines.push('# CHAIN-OF-CUSTODY (CoC) TRANSFER LEDGER');
  lines.push([
    'Entry #',
    'Timestamp (ISO 8601)',
    'Released By',
    'Released Role / Agency',
    'Received By',
    'Received Role / Agency',
    'Purpose of Transfer',
    'Transfer Location',
    'Packaging & Condition',
    'Initials',
  ].map(escapeCSV).join(','));

  session.custodyLedger.forEach((entry) => {
    lines.push([
      entry.sequenceNumber,
      entry.timestamp,
      entry.releasedByName,
      `${entry.releasedByRole} - ${entry.releasedByAgency}`,
      entry.receivedByName,
      `${entry.receivedByRole} - ${entry.receivedByAgency}`,
      entry.purpose,
      entry.transferLocation,
      entry.packagingCondition,
      entry.signeeInitials,
    ].map(escapeCSV).join(','));
  });

  return lines.join('\r\n');
}

export function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
