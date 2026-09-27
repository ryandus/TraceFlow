import QRCode from 'qrcode';
import { sha256 } from 'js-sha256';
import { ManifestSession } from '../types/forensic';

export interface ManifestAuditQRResult {
  manifestHash: string;
  qrDataUrl: string;
  verificationPayload: string;
  generatedAt: string;
}

// Deterministic: the same session data always yields the same payload and hash,
// so the fingerprint can be recomputed later from canonicalPayload in the JSON export.
export function manifestFingerprint(session: ManifestSession): { canonicalPayload: string; sha256: string } {
  const canonicalPayload = JSON.stringify({
    caseNumber: session.metadata.caseNumber || 'UNTITLED',
    evidenceItemNumber: session.metadata.evidenceItemNumber || 'ITEM-01',
    leadExaminer: session.metadata.examinerName,
    badgeId: session.metadata.examinerBadgeId,
    agency: session.metadata.agencyOrganization,
    acquisitionMethod: session.metadata.sourceAcquisitionMethod,
    writeBlocker: session.metadata.writeBlockerUsed,
    collectionTimestamp: session.metadata.collectionDateTime,
    filesCount: session.files.length,
    files: session.files.map((f) => ({
      name: f.name,
      sizeBytes: f.sizeBytes,
      sha256: f.sha256 || 'PENDING CALCULATION',
      md5: f.md5 || 'PENDING CALCULATION',
      status: f.verificationStatus,
    })),
    custodyLedgerEntries: session.custodyLedger.map((c) => ({
      seq: c.sequenceNumber,
      timestamp: c.timestamp,
      releasedBy: c.releasedByName,
      receivedBy: c.receivedByName,
      purpose: c.purpose,
      initials: c.signeeInitials,
    })),
  });

  return { canonicalPayload, sha256: sha256(canonicalPayload).toLowerCase() };
}

/**
 * Renders a QR code carrying the manifest fingerprint for the printed manifest.
 */
export async function generateManifestHashQR(session: ManifestSession): Promise<ManifestAuditQRResult> {
  const generatedAt = new Date().toISOString();
  const manifestHash = manifestFingerprint(session).sha256;

  const qrVerificationPayload = JSON.stringify({
    title: 'TraceFlow Digital Evidence Manifest',
    case: session.metadata.caseNumber,
    item: session.metadata.evidenceItemNumber,
    examiner: session.metadata.examinerName,
    sha256Baseline: manifestHash,
    hashedFiles: session.files.filter((f) => f.hashingStatus === 'completed').length,
    verifiedFiles: session.files.filter((f) => f.verificationStatus === 'match').length,
    totalFiles: session.files.length,
    issuedAt: generatedAt,
  });

  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(qrVerificationPayload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 140,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate audit QR code:', err);
  }

  return {
    manifestHash,
    qrDataUrl,
    verificationPayload: qrVerificationPayload,
    generatedAt,
  };
}
