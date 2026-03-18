// IndexedDB implementation for web/PWA
import { Memo, SyncStatus, MemoVisibility } from '../types';

const DB_NAME = 'memos-offline';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initDatabase(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Memos store
      if (!database.objectStoreNames.contains('memos')) {
        const memoStore = database.createObjectStore('memos', { keyPath: 'id' });
        memoStore.createIndex('serverId', 'serverId', { unique: true });
        memoStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        memoStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        memoStore.createIndex('pinned', 'pinned', { unique: false });
      }

      // Sync queue store
      if (!database.objectStoreNames.contains('syncQueue')) {
        const syncStore = database.createObjectStore('syncQueue', { 
          keyPath: 'id', 
          autoIncrement: true 
        });
        syncStore.createIndex('memoId', 'memoId', { unique: false });
      }
    };
  });
}

/**
 * Get database instance
 */
export function getDatabase(): IDBDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
}

/**
 * Close the database
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    db.close();
    db = null;
  }
}

// ============================================
// Memo Operations
// ============================================

/**
 * Get all memos
 */
export async function getMemos(options?: {
  syncStatus?: SyncStatus;
  pinned?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Memo[]> {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('memos', 'readonly');
    const store = tx.objectStore('memos');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      let memos = request.result as Memo[];

      // Apply filters
      if (options?.syncStatus) {
        memos = memos.filter(m => m.syncStatus === options.syncStatus);
      }
      if (options?.pinned !== undefined) {
        memos = memos.filter(m => m.pinned === options.pinned);
      }

      // Sort: pinned first, then by updatedAt desc
      memos.sort((a, b) => {
        if (a.pinned !== b.pinned) return b.pinned ? 1 : -1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      // Apply pagination
      if (options?.offset) {
        memos = memos.slice(options.offset);
      }
      if (options?.limit) {
        memos = memos.slice(0, options.limit);
      }

      resolve(memos);
    };
  });
}

/**
 * Get a single memo by ID
 */
export async function getMemoById(id: string): Promise<Memo | null> {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('memos', 'readonly');
    const store = tx.objectStore('memos');
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Insert a new memo
 */
export async function insertMemo(memo: Omit<Memo, 'id'> & { id?: string }): Promise<Memo> {
  const database = getDatabase();
  const id = memo.id || generateUUID();
  const now = new Date().toISOString();

  const newMemo: Memo = {
    ...memo,
    id,
    createdAt: memo.createdAt || now,
    updatedAt: memo.updatedAt || now,
  } as Memo;

  return new Promise((resolve, reject) => {
    const tx = database.transaction('memos', 'readwrite');
    const store = tx.objectStore('memos');
    const request = store.add(newMemo);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(newMemo);
  });
}

/**
 * Update an existing memo
 */
export async function updateMemo(
  id: string,
  updates: Partial<Omit<Memo, 'id'>>
): Promise<void> {
  const database = getDatabase();
  const existing = await getMemoById(id);
  
  if (!existing) {
    throw new Error(`Memo ${id} not found`);
  }

  const updatedMemo: Memo = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction('memos', 'readwrite');
    const store = tx.objectStore('memos');
    const request = store.put(updatedMemo);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Delete a memo
 */
export async function deleteMemo(id: string): Promise<void> {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('memos', 'readwrite');
    const store = tx.objectStore('memos');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get memos pending sync
 */
export async function getPendingMemos(): Promise<Memo[]> {
  return getMemos({ syncStatus: 'pending' });
}

// ============================================
// Sync Queue Operations
// ============================================

export type SyncAction = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
  id: number;
  memoId: string;
  action: SyncAction;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

/**
 * Add item to sync queue
 */
export async function addToSyncQueue(memoId: string, action: SyncAction): Promise<void> {
  const database = getDatabase();
  
  // Remove existing queue items for this memo
  const existing = await getSyncQueueByMemoId(memoId);
  for (const item of existing) {
    await removeFromSyncQueue(item.id);
  }

  return new Promise((resolve, reject) => {
    const tx = database.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const request = store.add({
      memoId,
      action,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function getSyncQueueByMemoId(memoId: string): Promise<SyncQueueItem[]> {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const index = store.index('memoId');
    const request = index.getAll(memoId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get all items in sync queue
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const items = request.result.sort(
        (a: SyncQueueItem, b: SyncQueueItem) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      resolve(items);
    };
  });
}

/**
 * Remove item from sync queue
 */
export async function removeFromSyncQueue(id: number): Promise<void> {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Update sync queue item on error
 */
export async function updateSyncQueueError(id: number, error: string): Promise<void> {
  const database = getDatabase();
  
  return new Promise(async (resolve, reject) => {
    const tx = database.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    const getRequest = store.get(id);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.retryCount++;
        item.lastError = error;
        const putRequest = store.put(item);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
  });
}

// ============================================
// Helpers
// ============================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
