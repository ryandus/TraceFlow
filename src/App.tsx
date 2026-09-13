import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  CaseMetadata, 
  EvidenceFile, 
  CustodyTransferEntry, 
  ManifestSession, 
  HashJobProgress 
} from './types/forensic';
import { ForensicHashEngine } from './services/hasher';
import { storageService } from './services/storage';
import { Navbar } from './components/Navbar';
import { CaseHeaderForm } from './components/CaseHeaderForm';
import { EvidenceFileIngestion } from './components/EvidenceFileIngestion';
import { EvidenceFileTable } from './components/EvidenceFileTable';
import { ChainOfCustodyLedger } from './components/ChainOfCustodyLedger';
import { SessionManagerModal } from './components/SessionManagerModal';
import { ExportModal } from './components/ExportModal';
import { PrintableManifest } from './components/PrintableManifest';
import { generateManifestJSON, downloadFile } from './services/exporter';

const createDefaultSession = (): ManifestSession => {
  const now = new Date();
  const utcDateTime = now.toISOString().slice(0, 16);
  const sessionId = `manifest-${Date.now()}`;

  return {
    id: sessionId,
    version: '1.0-ISO27037',
    createdAt: now.toISOString(),
    lastSavedAt: now.toISOString(),
    metadata: {
      caseNumber: 'DFIR-2026-0941',
      evidenceItemNumber: 'ITEM-01',
      examinerName: 'Agent J. Reynolds',
      examinerBadgeId: 'DFIR-742',
      agencyOrganization: 'Digital Forensics & Incident Response Division',
      mediaType: 'NVMe M.2 / PCIe SSD',
      sourceSerialNumber: 'SN-SAMSUNG980-849204A',
      sourceAcquisitionMethod: 'Physical (Bit-stream Image / Raw dd)',
      collectionDateTime: utcDateTime,
      collectionTimeZone: 'UTC',
      locationFound: 'Executive Workstation WS-04, Data Center Floor 2',
      writeBlockerUsed: 'Hardware Write Blocker (Tableau / WiebeTech)',
      notes: 'Acquired on-site following security breach notification. Drive unseated and attached to Tableau T8u.',
    },
    files: [],
    custodyLedger: [
      {
        id: `coc-${Date.now()}`,
        sequenceNumber: 1,
        timestamp: now.toISOString(),
        releasedByName: 'SecOps Incident Response Team',
        releasedByRole: 'First Responder / SecOps Lead',
        releasedByAgency: 'Enterprise Security Division',
        receivedByName: 'Agent J. Reynolds',
        receivedByRole: 'DFIR-742',
        receivedByAgency: 'Digital Forensics Unit',
        purpose: 'Initial Evidence Ingestion & Securing',
        transferLocation: 'On-site Incident Room 204',
        packagingCondition: 'Sealed in Faraday anti-static bag with Tamper Tape #TT-9104; seal intact',
        signeeInitials: 'JR',
        isExample: true,
      },
    ],
    summary: {
      totalFiles: 0,
      totalSizeBytes: 0,
      verifiedFiles: 0,
      flaggedMismatches: 0,
    },
  };
};

export default function App() {
  const [session, setSession] = useState<ManifestSession>(createDefaultSession);
  const [allSessions, setAllSessions] = useState<ManifestSession[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Modals
  const [isSessionManagerOpen, setIsSessionManagerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Hashing Progress & Engine
  const hashEngineRef = useRef<ForensicHashEngine>(new ForensicHashEngine());
  const abortControllerRef = useRef<AbortController | null>(null);

  const [progress, setProgress] = useState<HashJobProgress>({
    currentFileIndex: 0,
    totalFiles: 0,
    currentFileName: '',
    currentFilePercent: 0,
    totalPercent: 0,
    bytesProcessed: 0,
    totalBytes: 0,
    speedBytesPerSec: 0,
    etaSeconds: 0,
    isHashing: false,
    isPaused: false,
  });

  // Load saved sessions from IndexedDB on startup
  useEffect(() => {
    async function initStorage() {
      try {
        const storedSessions = await storageService.getAllSessions();
        setAllSessions(storedSessions);

        if (storedSessions.length > 0) {
          const activeId = await storageService.getActiveSessionId();
          const activeSession = activeId ? storedSessions.find((s) => s.id === activeId) : null;
          if (activeSession) {
            setSession(activeSession);
            setLastSavedAt(activeSession.lastSavedAt);
          } else {
            // Save the default initial session
            await storageService.saveSession(session);
            setLastSavedAt(session.lastSavedAt);
            setAllSessions([session, ...storedSessions]);
          }
        } else {
          // Initialize first session into storage
          await storageService.saveSession(session);
          setLastSavedAt(session.lastSavedAt);
          setAllSessions([session]);
        }
      } catch (err) {
        console.warn('IndexedDB initial load error:', err);
      }
    }
    initStorage();
  }, []);

  // Save Session to IndexedDB
  const handleSaveSession = useCallback(async (currentSession: ManifestSession) => {
    setIsSaving(true);
    try {
      await storageService.saveSession(currentSession);
      setLastSavedAt(new Date().toISOString());
      setHasUnsavedChanges(false);

      // Refresh stored sessions list
      const updated = await storageService.getAllSessions();
      setAllSessions(updated);
    } catch (err) {
      console.error('Auto-save to IndexedDB failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // 30-second Auto-save Interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasUnsavedChanges) {
        handleSaveSession(session);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [hasUnsavedChanges, session, handleSaveSession]);

  // Update Case Metadata
  const handleMetadataChange = (updated: Partial<CaseMetadata>) => {
    setSession((prev) => {
      const next = {
        ...prev,
        metadata: { ...prev.metadata, ...updated },
      };
      setHasUnsavedChanges(true);
      return next;
    });
  };

  // Add Custody Transfer Entry
  const handleAddCustodyEntry = (entryData: Omit<CustodyTransferEntry, 'id' | 'sequenceNumber'>) => {
    setSession((prev) => {
      const newEntry: CustodyTransferEntry = {
        ...entryData,
        id: `coc-${Date.now()}`,
        sequenceNumber: prev.custodyLedger.length + 1,
      };

      const next: ManifestSession = {
        ...prev,
        custodyLedger: [...prev.custodyLedger, newEntry],
      };
      handleSaveSession(next);
      return next;
    });
  };

  // Update Custody Transfer Entry
  const handleUpdateCustodyEntry = (entryId: string, updated: Partial<CustodyTransferEntry>) => {
    setSession((prev) => {
      const updatedLedger = prev.custodyLedger.map((entry) => {
        if (entry.id === entryId) {
          return { ...entry, ...updated, isExample: false };
        }
        return entry;
      });
      const next: ManifestSession = {
        ...prev,
        custodyLedger: updatedLedger,
      };
      handleSaveSession(next);
      return next;
    });
  };

  // Remove Custody Transfer Entry
  const handleRemoveCustodyEntry = (entryId: string) => {
    setSession((prev) => {
      const filtered = prev.custodyLedger.filter((e) => e.id !== entryId);
      const renumbered = filtered.map((e, idx) => ({
        ...e,
        sequenceNumber: idx + 1,
      }));
      const next: ManifestSession = {
        ...prev,
        custodyLedger: renumbered,
      };
      handleSaveSession(next);
      return next;
    });
  };

  // Clear Custody Ledger
  const handleClearCustodyLedger = () => {
    if (window.confirm('Clear all chain-of-custody transfer entries?')) {
      setSession((prev) => {
        const next: ManifestSession = {
          ...prev,
          custodyLedger: [],
        };
        handleSaveSession(next);
        return next;
      });
    }
  };

  // Process and Hash Selected Files
  const handleFilesSelected = async (filesList: FileList | File[], isDirectory: boolean = false) => {
    const fileArray = Array.from(filesList);
    if (fileArray.length === 0) return;

    // Create initial pending entries
    const newEvidenceItems: EvidenceFile[] = fileArray.map((file) => {
      const relPath = file.webkitRelativePath || file.name;
      return {
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        name: file.name,
        relativePath: relPath,
        sizeBytes: file.size,
        mimeType: file.type || 'application/octet-stream',
        lastModified: file.lastModified,
        sha256: '',
        md5: '',
        hashingStatus: 'pending',
        hashProgressPercent: 0,
        verificationStatus: 'unverified',
      };
    });

    // Add to session immediately as pending
    setSession((prev) => {
      const next = {
        ...prev,
        files: [...prev.files, ...newEvidenceItems],
      };
      setHasUnsavedChanges(true);
      return next;
    });

    // Begin batch chunked hashing
    const totalBytes = fileArray.reduce((acc, f) => acc + f.size, 0);
    let totalBytesProcessed = 0;
    const startTime = Date.now();

    abortControllerRef.current = new AbortController();
    const engine = hashEngineRef.current;

    setProgress({
      currentFileIndex: 0,
      totalFiles: fileArray.length,
      currentFileName: fileArray[0].name,
      currentFilePercent: 0,
      totalPercent: 0,
      bytesProcessed: 0,
      totalBytes,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      isHashing: true,
      isPaused: false,
    });

    for (let i = 0; i < fileArray.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        break;
      }

      const file = fileArray[i];
      const evidenceItem = newEvidenceItems[i];

      setProgress((prev) => ({
        ...prev,
        currentFileIndex: i,
        currentFileName: file.name,
        currentFilePercent: 0,
      }));

      try {
        const hashResult = await engine.hashFile(
          file,
          (processedInFile, percent) => {
            const currentTotalProcessed = totalBytesProcessed + processedInFile;
            const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
            const speed = currentTotalProcessed / elapsedSec;
            const remainingBytes = Math.max(0, totalBytes - currentTotalProcessed);
            const eta = speed > 0 ? remainingBytes / speed : 0;
            const overallPercent = totalBytes > 0 ? Math.min(100, Math.round((currentTotalProcessed / totalBytes) * 100)) : 100;

            setProgress((prev) => ({
              ...prev,
              currentFilePercent: percent,
              totalPercent: overallPercent,
              bytesProcessed: currentTotalProcessed,
              speedBytesPerSec: speed,
              etaSeconds: eta,
            }));
          },
          abortControllerRef.current?.signal
        );

        totalBytesProcessed += file.size;

        // Update file entry with hashes
        setSession((prev) => {
          const updatedFiles = prev.files.map((f) => {
            if (f.id === evidenceItem.id) {
              return {
                ...f,
                sha256: hashResult.sha256,
                md5: hashResult.md5,
                hashingStatus: 'completed' as const,
                hashProgressPercent: 100,
              };
            }
            return f;
          });
          const next = { ...prev, files: updatedFiles };
          return next;
        });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.log('Hashing cancelled by user.');
          break;
        }
        console.error('File hashing failed:', err);
        setSession((prev) => {
          const updatedFiles = prev.files.map((f) => {
            if (f.id === evidenceItem.id) {
              return {
                ...f,
                hashingStatus: 'error' as const,
                errorMessage: err instanceof Error ? err.message : 'Unknown hashing error',
              };
            }
            return f;
          });
          return { ...prev, files: updatedFiles };
        });
      }
    }

    setProgress((prev) => ({
      ...prev,
      isHashing: false,
      isPaused: false,
      currentFilePercent: 100,
      totalPercent: 100,
    }));

    // Auto-save after batch completion
    setSession((latest) => {
      handleSaveSession(latest);
      return latest;
    });
  };

  // Pause / Resume / Cancel Controls
  const handlePauseHashing = () => {
    hashEngineRef.current.pause();
    setProgress((p) => ({ ...p, isPaused: true }));
  };

  const handleResumeHashing = () => {
    hashEngineRef.current.resume();
    setProgress((p) => ({ ...p, isPaused: false }));
  };

  const handleCancelHashing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    hashEngineRef.current.cancel();
    setProgress((p) => ({ ...p, isHashing: false, isPaused: false }));
  };

  // Expected Hash Verification Logic
  const handleUpdateExpectedHash = (fileId: string, expected: string) => {
    setSession((prev) => {
      const updatedFiles = prev.files.map((file) => {
        if (file.id === fileId) {
          const cleanExpected = expected.trim().toLowerCase();
          let status: 'unverified' | 'match' | 'mismatch' = 'unverified';

          if (cleanExpected.length > 0) {
            const matchesSha = file.sha256 && file.sha256.toLowerCase() === cleanExpected;
            const matchesMd5 = file.md5 && file.md5.toLowerCase() === cleanExpected;
            status = matchesSha || matchesMd5 ? 'match' : 'mismatch';
          }

          return {
            ...file,
            expectedHash: expected.trim(),
            verificationStatus: status,
          };
        }
        return file;
      });

      const next = { ...prev, files: updatedFiles };
      setHasUnsavedChanges(true);
      return next;
    });
  };

  // Bulk Hash Import Verification
  const handleBulkVerifyPaste = (pastedText: string) => {
    const lines = pastedText.split('\n');
    const hashDict = new Map<string, string>(); // key: hash or filename -> value: hash

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;

      // Handle "hash  filename" format (e.g. from sha256sum or md5sum)
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const potentialHash = parts[0].toLowerCase();
        const fileName = parts.slice(1).join(' ').replace(/^[*?]/, '').trim();
        hashDict.set(fileName.toLowerCase(), potentialHash);
        hashDict.set(potentialHash, potentialHash);
      } else if (parts.length === 1 && (parts[0].length === 32 || parts[0].length === 64)) {
        hashDict.set(parts[0].toLowerCase(), parts[0].toLowerCase());
      }
    });

    setSession((prev) => {
      const updatedFiles = prev.files.map((file) => {
        const sha = file.sha256?.toLowerCase();
        const md5 = file.md5?.toLowerCase();
        const fname = file.name.toLowerCase();

        let matchedHash = hashDict.get(fname);
        if (!matchedHash && sha && hashDict.has(sha)) {
          matchedHash = sha;
        }
        if (!matchedHash && md5 && hashDict.has(md5)) {
          matchedHash = md5;
        }

        if (matchedHash) {
          const isMatch = matchedHash === sha || matchedHash === md5;
          return {
            ...file,
            expectedHash: matchedHash,
            verificationStatus: isMatch ? ('match' as const) : ('mismatch' as const),
          };
        }
        return file;
      });

      const next = { ...prev, files: updatedFiles };
      handleSaveSession(next);
      return next;
    });
  };

  // Remove File
  const handleRemoveFile = (fileId: string) => {
    setSession((prev) => {
      const updated = {
        ...prev,
        files: prev.files.filter((f) => f.id !== fileId),
      };
      handleSaveSession(updated);
      return updated;
    });
  };

  // Clear Files
  const handleClearFiles = () => {
    if (window.confirm('Are you sure you want to clear all evidence files from this manifest?')) {
      setSession((prev) => {
        const updated = { ...prev, files: [] };
        handleSaveSession(updated);
        return updated;
      });
    }
  };

  // Load Forensic Sample Dataset
  const handleLoadSampleData = () => {
    const sampleFiles: EvidenceFile[] = [
      {
        id: 'sample-disk-001',
        name: 'WS04_PhysicalDrive0.001',
        relativePath: 'PhysicalDrive0/WS04_PhysicalDrive0.001',
        sizeBytes: 2048576000, // ~1.9 GB chunk
        mimeType: 'application/octet-stream (Raw Disk Image)',
        lastModified: Date.now() - 3600000 * 24,
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        md5: '098f6bcd4621d373cade4e832627b4f6',
        hashingStatus: 'completed',
        hashProgressPercent: 100,
        expectedHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        verificationStatus: 'match',
        notes: 'EnCase / FTK raw image chunk verified against acquisition log.',
      },
      {
        id: 'sample-mem-raw',
        name: 'win11_x64_volatile_memory.raw',
        relativePath: 'Live_Triage/win11_x64_volatile_memory.raw',
        sizeBytes: 16777216000, // 16 GB RAM capture
        mimeType: 'application/x-raw-memory',
        lastModified: Date.now() - 3600000 * 20,
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        md5: 'd41d8cd98f00b204e9800998ecf8427e',
        hashingStatus: 'completed',
        hashProgressPercent: 100,
        expectedHash: 'd41d8cd98f00b204e9800998ecf8427e',
        verificationStatus: 'match',
        notes: 'Captured via WinPmem live triage memory acquisition script.',
      },
      {
        id: 'sample-mismatch-log',
        name: 'suspicious_powershell_history.txt',
        relativePath: 'Users/Administrator/AppData/Roaming/Microsoft/Windows/PowerShell/PSReadLine/ConsoleHost_history.txt',
        sizeBytes: 45281,
        mimeType: 'text/plain',
        lastModified: Date.now() - 3600000 * 12,
        sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        md5: '1bc29b36f623ba82aaf6724fd3b16718',
        hashingStatus: 'completed',
        hashProgressPercent: 100,
        expectedHash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae', // intentionally mismatched!
        verificationStatus: 'mismatch',
        notes: 'INTEGRITY ALERT: File hash does not match pre-triage checksum ledger!',
      },
      {
        id: 'sample-zero-byte',
        name: 'canary_sentinel_empty.flag',
        relativePath: 'canary_sentinel_empty.flag',
        sizeBytes: 0,
        mimeType: 'application/octet-stream',
        lastModified: Date.now(),
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        md5: 'd41d8cd98f00b204e9800998ecf8427e',
        hashingStatus: 'completed',
        hashProgressPercent: 100,
        expectedHash: '',
        verificationStatus: 'unverified',
        notes: '0-byte sentinel file test per ISO/IEC 27037 standard verification.',
      },
    ];

    setSession((prev) => {
      const next = {
        ...prev,
        files: [...prev.files, ...sampleFiles],
      };
      handleSaveSession(next);
      return next;
    });
  };

  // Start a New Clean Session
  const handleNewManifest = () => {
    if (session.files.length > 0) {
      const proceed = window.confirm('Start a new evidence manifest? Current progress is saved in your local vault.');
      if (!proceed) return;
    }
    const brandNew = createDefaultSession();
    setSession(brandNew);
    handleSaveSession(brandNew);
  };

  // Resume Session from IndexedDB
  const handleResumeSession = async (sessionId: string) => {
    try {
      const target = await storageService.getSession(sessionId);
      if (target) {
        setSession(target);
        setLastSavedAt(target.lastSavedAt);
        setHasUnsavedChanges(false);
      }
    } catch (err) {
      console.error('Failed to resume session:', err);
    }
  };

  // Duplicate Session
  const handleDuplicateSession = async (sessionId: string) => {
    try {
      const cloned = await storageService.duplicateSession(sessionId);
      const list = await storageService.getAllSessions();
      setAllSessions(list);
      setSession(cloned);
      setLastSavedAt(cloned.lastSavedAt);
    } catch (err) {
      console.error('Failed to duplicate session:', err);
    }
  };

  // Delete Session
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await storageService.deleteSession(sessionId);
      const list = await storageService.getAllSessions();
      setAllSessions(list);

      // If we deleted active session, switch or create new
      if (sessionId === session.id) {
        if (list.length > 0) {
          setSession(list[0]);
          setLastSavedAt(list[0].lastSavedAt);
        } else {
          const fresh = createDefaultSession();
          setSession(fresh);
          await storageService.saveSession(fresh);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  // Export All Sessions Backup
  const handleExportAllBackup = async () => {
    try {
      const all = await storageService.getAllSessions();
      const backupPayload = {
        exportedAt: new Date().toISOString(),
        backupStandard: 'ISO/IEC 27037 Evidence Manifest Repository',
        sessionsCount: all.length,
        sessions: all,
      };
      downloadFile(
        JSON.stringify(backupPayload, null, 2),
        `Forensic_Manifest_Vault_Backup_${new Date().toISOString().slice(0, 10)}.json`,
        'application/json'
      );
    } catch (err) {
      console.error('Backup export failed:', err);
    }
  };

  // Trigger Print / PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} transition-colors duration-200 flex flex-col font-sans`}>
      {/* Top Navigation Bar */}
      <Navbar
        caseNumber={session.metadata.caseNumber}
        evidenceItemNumber={session.metadata.evidenceItemNumber}
        lastSavedAt={lastSavedAt}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
        savedSessionsCount={allSessions.length}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        onOpenSessionManager={() => setIsSessionManagerOpen(true)}
        onNewManifest={handleNewManifest}
        onOpenExport={() => setIsExportModalOpen(true)}
        onPrint={handlePrint}
      />

      {/* Main Forensic Workstation Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 no-print">
        {/* 1. Case Header & Metadata Form */}
        <CaseHeaderForm
          metadata={session.metadata}
          onChange={handleMetadataChange}
        />

        {/* 2. Evidence File Ingestion & Real-Time Hashing Engine */}
        <EvidenceFileIngestion
          onFilesSelected={handleFilesSelected}
          onLoadSampleData={handleLoadSampleData}
          progress={progress}
          onPause={handlePauseHashing}
          onResume={handleResumeHashing}
          onCancel={handleCancelHashing}
          isQueueEmpty={session.files.length === 0}
        />

        {/* 3. Evidence File Table with Dual Hashing and Integrity Verification */}
        <EvidenceFileTable
          files={session.files}
          onUpdateExpectedHash={handleUpdateExpectedHash}
          onRemoveFile={handleRemoveFile}
          onClearFiles={handleClearFiles}
          onBulkVerifyPaste={handleBulkVerifyPaste}
        />

        {/* 4. Chain of Custody (CoC) Ledger */}
        <ChainOfCustodyLedger
          entries={session.custodyLedger}
          defaultExaminer={session.metadata.examinerName}
          defaultBadge={session.metadata.examinerBadgeId}
          defaultAgency={session.metadata.agencyOrganization}
          onAddEntry={handleAddCustodyEntry}
          onUpdateEntry={handleUpdateCustodyEntry}
          onRemoveEntry={handleRemoveCustodyEntry}
          onClearLedger={handleClearCustodyLedger}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-5 mt-auto no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2.5">
          {/* Branded Watermark */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-slate-400 border-b border-slate-800/60 pb-2.5">
            <div className="flex items-center gap-2 text-cyan-400/90 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>TraceFlow — An Evidence Custody & Hash Manifest Engine | Engineered by R. Hanks</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Session ID: <span className="text-slate-300 font-bold">{session.id}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500 font-mono">
            <div className="flex flex-wrap items-center gap-2">
              <span>ISO/IEC 27037 Compliance Standard</span>
              <span>•</span>
              <span>Client-Side SubtleCrypto & Stream Processing</span>
              <span>•</span>
              <span>Zero Server Uploads</span>
              <span>•</span>
              <span>Local Air-Gapped Privacy</span>
            </div>
            <div>
              Status: <span className="text-emerald-400">Operational</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <SessionManagerModal
        isOpen={isSessionManagerOpen}
        onClose={() => setIsSessionManagerOpen(false)}
        sessions={allSessions}
        currentSessionId={session.id}
        onResumeSession={handleResumeSession}
        onDuplicateSession={handleDuplicateSession}
        onDeleteSession={handleDeleteSession}
        onNewSession={handleNewManifest}
        onExportAllBackup={handleExportAllBackup}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        session={session}
        onTriggerPrint={handlePrint}
      />

      {/* Dedicated Print-Only Manifest Document */}
      <PrintableManifest session={session} />
    </div>
  );
}
