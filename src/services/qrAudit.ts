import QRCode from 'qrcode';
import { sha256 } from 'js-sha256';
import { ManifestSession } from '../types/forensic';

export interface ManifestAuditQRResult {
  manifestHash: string;
  qrDataUrl: string;
  verificationPayload: string;
  generatedAt: string;
}

/**
 * Audit Defensibility (QR Code)
 * Generates an immutable cryptographic SHA-256 fingerprint of the finalized manifest
 * and renders a high-density QR code for physical ledger printout attestation.
 */
export async function generateManifestHashQR(
  session: ManifestSession,
  domString?: string
): Promise<ManifestAuditQRResult> {
  const generatedAt = new Date().toISOString();

  // Canonical cryptographic representation of the entire case manifest
  const canonicalManifestPayload = domString || JSON.stringify({
    standard: 'ISO/IEC 27037:2012',
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
    generatedAt,
  });

  const manifestHash = sha256(canonicalManifestPayload).toLowerCase();

  // The QR code contains verified audit baseline credentials for court admissibility
  const qrVerificationPayload = JSON.stringify({
    title: 'TraceFlow ISO-27037 Digital Evidence Manifest',
    case: session.metadata.caseNumber,
    item: session.metadata.evidenceItemNumber,
    examiner: session.metadata.examinerName,
    sha256Baseline: manifestHash,
    verifiedFiles: session.files.filter((f) => f.hashingStatus === 'completed').length,
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
