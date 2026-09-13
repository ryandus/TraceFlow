import { ManifestSession } from '../types/forensic';

const DB_NAME = 'ForensicManifestDB';
const DB_VERSION = 1;
const STORE_SESSIONS = 'sessions';
const STORE_APP_STATE = 'app_state';
const CURRENT_SESSION_KEY = 'active_session_id';

class ForensicStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
          const sessionStore = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
          sessionStore.createIndex('caseNumber', 'metadata.caseNumber', { unique: false });
          sessionStore.createIndex('lastSavedAt', 'lastSavedAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_APP_STATE)) {
          db.createObjectStore(STORE_APP_STATE, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to open IndexedDB.'));
      };
    });

    return this.dbPromise;
  }

  public async saveSession(session: ManifestSession): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_SESSIONS, STORE_APP_STATE], 'readwrite');
      const sessionStore = tx.objectStore(STORE_SESSIONS);
      const stateStore = tx.objectStore(STORE_APP_STATE);

      session.lastSavedAt = new Date().toISOString();
      sessionStore.put(session);
      stateStore.put({ key: CURRENT_SESSION_KEY, value: session.id });

      tx.oncomplete = () => {
        try {
          // Keep a minimal localStorage backup marker for instant sync indicators
          localStorage.setItem('forensic_manifest_last_saved', session.lastSavedAt);
          localStorage.setItem('forensic_manifest_active_id', session.id);
        } catch {
          // Ignore localStorage quota limits if any
        }
        resolve();
      };

      tx.onerror = () => {
        reject(tx.error || new Error('Failed to save session to IndexedDB'));
      };
    });
  }

  public async getSession(id: string): Promise<ManifestSession | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SESSIONS, 'readonly');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.get(id);

      req.onsuccess = () => {
        resolve((req.result as ManifestSession) || null);
      };

      req.onerror = () => {
        reject(req.error || new Error(`Failed to retrieve session ${id}`));
      };
    });
  }

  public async getAllSessions(): Promise<ManifestSession[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SESSIONS, 'readonly');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.getAll();

      req.onsuccess = () => {
        const sessions = (req.result as ManifestSession[]) || [];
        // Sort descending by lastSavedAt
        sessions.sort((a, b) => new Date(b.lastSavedAt).getTime() - new Date(a.lastSavedAt).getTime());
        resolve(sessions);
      };

      req.onerror = () => {
        reject(req.error || new Error('Failed to list saved sessions'));
      };
    });
  }

  public async deleteSession(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      store.delete(id);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error(`Failed to delete session ${id}`));
    });
  }

  public async duplicateSession(originalId: string): Promise<ManifestSession> {
    const original = await this.getSession(originalId);
    if (!original) {
      throw new Error(`Original session ${originalId} not found`);
    }

    const newId = `manifest-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const cloned: ManifestSession = {
      ...JSON.parse(JSON.stringify(original)),
      id: newId,
      createdAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
      metadata: {
        ...original.metadata,
        evidenceItemNumber: `${original.metadata.evidenceItemNumber}-COPY`,
        notes: `Duplicated from session ${original.id} (${original.metadata.caseNumber}). ${original.metadata.notes || ''}`.trim(),
      },
      // Keep chain of custody ledger with a copy notice
      custodyLedger: [
        ...original.custodyLedger,
        {
          id: `coc-${Date.now()}`,
          sequenceNumber: original.custodyLedger.length + 1,
          timestamp: new Date().toISOString(),
          releasedByName: original.metadata.examinerName || 'System',
          releasedByRole: original.metadata.examinerBadgeId || 'Examiner',
          releasedByAgency: original.metadata.agencyOrganization || 'Forensics Unit',
          receivedByName: original.metadata.examinerName || 'System',
          receivedByRole: 'Cloned Record Ingestion',
          receivedByAgency: original.metadata.agencyOrganization || 'Forensics Unit',
          purpose: 'Laboratory Analysis - Cloned Manifest Session for Sub-Exhibit',
          transferLocation: original.metadata.locationFound || 'Digital Forensics Lab',
          packagingCondition: 'Electronic record clone',
          signeeInitials: 'SYS',
        },
      ],
    };

    await this.saveSession(cloned);
    return cloned;
  }

  public async getActiveSessionId(): Promise<string | null> {
    try {
      const localId = localStorage.getItem('forensic_manifest_active_id');
      if (localId) return localId;

      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_APP_STATE, 'readonly');
        const store = tx.objectStore(STORE_APP_STATE);
        const req = store.get(CURRENT_SESSION_KEY);
        req.onsuccess = () => resolve(req.result ? req.result.value : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }
}

export const storageService = new ForensicStorageService();
