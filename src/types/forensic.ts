export type AcquisitionMethod = 
  | 'Physical (Bit-stream Image / Raw dd)'
  | 'Logical (Partition / File System Extraction)'
  | 'Targeted File Copy (Selective Triage)'
  | 'Triage Image (Live Volatile / Memory Artifact)'
  | 'Forensic Container (E01 / AFF4 / VHDX)';

export type MediaType = 
  | 'NVMe M.2 / PCIe SSD'
  | 'SATA SSD / HDD'
  | 'USB Flash Drive / External Media'
  | 'Mobile Device (eMMC / UFS Flash)'
  | 'SD / MicroSD Memory Card'
  | 'Virtual Machine Disk (VMDK / VHDX)'
  | 'RAM / Volatile Memory Dump'
  | 'Cloud Object / Volume Snapshot'
  | 'Optical Media (CD/DVD/Blu-ray)'
  | 'Other / Custom Media';

export type WriteBlockerType = 
  | 'Hardware Write Blocker (Tableau / WiebeTech)'
  | 'Software Write Blocker / Registry Enforced'
  | 'Read-Only Hardware Bridge'
  | 'Read-Only OS Mount Flag (Linux ro,loop)'
  | 'N/A - Live Triage Ingestion'
  | 'None / Not Verified';

export interface CaseMetadata {
  caseNumber: string;
  evidenceItemNumber: string;
  examinerName: string;
  examinerBadgeId: string;
  agencyOrganization: string;
  mediaType: MediaType | string;
  sourceSerialNumber: string;
  sourceAcquisitionMethod: AcquisitionMethod;
  collectionDateTime: string; // ISO string or local YYYY-MM-DDTHH:mm
  collectionTimeZone: 'UTC' | 'Local';
  locationFound: string;
  writeBlockerUsed: WriteBlockerType;
  notes: string;
}

export type HashVerificationStatus = 'unverified' | 'match' | 'mismatch';

export interface EvidenceFile {
  id: string;
  name: string;
  relativePath: string;
  sizeBytes: number;
  mimeType: string;
  lastModified: number;
  sha256: string;
  md5: string;
  hashingStatus: 'pending' | 'hashing' | 'completed' | 'error';
  hashProgressPercent: number;
  speedBytesPerSec?: number;
  etaSeconds?: number;
  errorMessage?: string;
  expectedHash?: string;
  verificationStatus: HashVerificationStatus;
  notes?: string;
}

export interface CustodyTransferEntry {
  id: string;
  sequenceNumber: number;
  timestamp: string; // ISO 8601
  releasedByName: string;
  releasedByRole: string;
  releasedByAgency: string;
  receivedByName: string;
  receivedByRole: string;
  receivedByAgency: string;
  purpose: string;
  transferLocation: string;
  packagingCondition: string;
  signatureDataUrl?: string; // base64 canvas image or initials
  signeeInitials: string;
  isExample?: boolean; // Flag if this is an illustrative example entry
}

export interface ManifestSession {
  id: string;
  version: string; // e.g. "1.0-ISO27037"
  createdAt: string;
  lastSavedAt: string;
  metadata: CaseMetadata;
  files: EvidenceFile[];
  custodyLedger: CustodyTransferEntry[];
  summary: {
    totalFiles: number;
    totalSizeBytes: number;
    verifiedFiles: number;
    flaggedMismatches: number;
  };
}

export interface HashJobProgress {
  currentFileIndex: number;
  totalFiles: number;
  currentFileName: string;
  currentFilePercent: number;
  totalPercent: number;
  bytesProcessed: number;
  totalBytes: number;
  speedBytesPerSec: number;
  etaSeconds: number;
  isHashing: boolean;
  isPaused: boolean;
}
