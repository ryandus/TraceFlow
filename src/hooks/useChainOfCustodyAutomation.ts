import { useEffect, useRef } from 'react';
import { EvidenceFile, CaseMetadata, CustodyTransferEntry } from '../types/forensic';

interface UseChainOfCustodyAutomationProps {
  files: EvidenceFile[];
  metadata: CaseMetadata;
  custodyLedger: CustodyTransferEntry[];
  onAppendEntry: (entry: CustodyTransferEntry) => void;
}

/**
 * Chain of Custody (CoC) Automation Hook
 * Listens for the first successful file hash completion in the session.
 * Upon completion, automatically generates and appends Entry #1 in the CoC ledger,
 * programmatically pulling 'Lead Examiner', 'Agency', and 'Location' variables from the Case Header.
 */
export function useChainOfCustodyAutomation({
  files,
  metadata,
  custodyLedger,
  onAppendEntry,
}: UseChainOfCustodyAutomationProps) {
  const hasTriggeredRef = useRef<boolean>(false);

  useEffect(() => {
    if (hasTriggeredRef.current) return;

    // Detect the first completed file hash
    const firstCompletedFile = files.find(
      (f) => f.hashingStatus === 'completed' && Boolean(f.sha256)
    );

    if (!firstCompletedFile) return;

    // Check if real (non-example) entry #1 already exists
    const hasExistingRealEntry = custodyLedger.some(
      (entry) => !entry.isExample && entry.sequenceNumber === 1
    );

    if (hasExistingRealEntry) {
      hasTriggeredRef.current = true;
      return;
    }

    hasTriggeredRef.current = true;

    // Extract initials from examiner name (e.g. "Agent J. Reynolds" -> "JR")
    const examinerClean = (metadata.examinerName || 'Lead Examiner').replace(/Agent|Inspector|Officer|Dr\./gi, '').trim();
    const initials = examinerClean
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .join('')
      .toUpperCase() || 'EX';

    const nowISO = new Date().toISOString();

    const automatedEntry: CustodyTransferEntry = {
      id: `coc-auto-${Date.now()}`,
      sequenceNumber: 1,
      timestamp: nowISO,
      releasedByName: 'First Responder / SecOps Source',
      releasedByRole: 'Evidence Custodian',
      releasedByAgency: metadata.agencyOrganization || 'Field Operations Division',
      receivedByName: metadata.examinerName || 'Lead Forensic Examiner',
      receivedByRole: metadata.examinerBadgeId 
        ? `Lead Examiner (${metadata.examinerBadgeId})` 
        : 'Lead Examiner',
      receivedByAgency: metadata.agencyOrganization || 'Digital Forensics Unit',
      purpose: `Initial Ingestion & Cryptographic Verification of ${firstCompletedFile.name}`,
      transferLocation: metadata.locationFound || 'Digital Forensics Laboratory',
      packagingCondition: 'Secure tamper-evident container; bit-stream SHA-256 integrity verified.',
      signeeInitials: initials,
      isExample: false,
    };

    onAppendEntry(automatedEntry);
  }, [files, metadata, custodyLedger, onAppendEntry]);
}
