import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';
import { Memo, SyncStatus, MemoVisibility } from '../types';

const DB_NAME = 'memos.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the database
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  db = await SQLite.openDatabaseAsync(DB_NAME);
  
  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');
  
  // Create tables
  await db.execAsync(CREATE_TABLES_SQL);
  
  return db;
}

/**
 * Get database instance
 */
export function getDatabase(): SQLite.SQLiteDatabase {
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
    await db.closeAsync();
    db = null;
  }
}

// ============================================
// Memo Operations
// ============================================

/**
 * Get all memos, optionally filtered
 */
export async function getMemos(options?: {
  syncStatus?: SyncStatus;
  pinned?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Memo[]> {
  const database = getDatabase();
  
  let query = 'SELECT * FROM memos WHERE 1=1';
  const params: (string | number)[] = [];

  if (options?.syncStatus) {
    query += ' AND sync_status = ?';
    params.push(options.syncStatus);
  }

  if (options?.pinned !== undefined) {
    query += ' AND pinned = ?';
    params.push(options.pinned ? 1 : 0);
  }

  query += ' ORDER BY pinned DESC, updated_at DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
    if (options.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }
  }

  const rows = await database.getAllAsync<MemoRow>(query, params);
  return rows.map(rowToMemo);
}

/**
 * Get a single memo by ID
 */
export async function getMemoById(id: string): Promise<Memo | null> {
  const database = getDatabase();
  const row = await database.getFirstAsync<MemoRow>(
    'SELECT * FROM memos WHERE id = ?',
    [id]
  );
  return row ? rowToMemo(row) : null;
}

/**
 * Insert a new memo
 */
export async function insertMemo(memo: Omit<Memo, 'id'> & { id?: string }): Promise<Memo> {
  const database = getDatabase();
  const id = memo.id || generateUUID();
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO memos (id, server_id, content, visibility, pinned, created_at, updated_at, synced_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      memo.serverId || null,
      memo.content,
      memo.visibility,
      memo.pinned ? 1 : 0,
      memo.createdAt || now,
      memo.updatedAt || now,
      memo.syncedAt || null,
      memo.syncStatus,
    ]
  );

  return {
    ...memo,
    id,
    createdAt: memo.createdAt || now,
    updatedAt: memo.updatedAt || now,
  } as Memo;
}

/**
 * Update an existing memo
 */
export async function updateMemo(
  id: string,
  updates: Partial<Omit<Memo, 'id'>>
): Promise<void> {
  const database = getDatabase();
  const fields: string[] = [];
  const params: (string | number | null)[] = [];

  if (updates.content !== undefined) {
    fields.push('content = ?');
    params.push(updates.content);
  }
  if (updates.visibility !== undefined) {
    fields.push('visibility = ?');
    params.push(updates.visibility);
  }
  if (updates.pinned !== undefined) {
    fields.push('pinned = ?');
    params.push(updates.pinned ? 1 : 0);
  }
  if (updates.syncStatus !== undefined) {
    fields.push('sync_status = ?');
    params.push(updates.syncStatus);
  }
  if (updates.syncedAt !== undefined) {
    fields.push('synced_at = ?');
    params.push(updates.syncedAt);
  }
  if (updates.serverId !== undefined) {
    fields.push('server_id = ?');
    params.push(updates.serverId);
  }

  // Always update updated_at
  fields.push('updated_at = ?');
  params.push(new Date().toISOString());

  params.push(id);

  await database.runAsync(
    `UPDATE memos SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
}

/**
 * Delete a memo
 */
export async function deleteMemo(id: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM memos WHERE id = ?', [id]);
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
  
  // Remove existing queue items for this memo (we only need the latest action)
  await database.runAsync('DELETE FROM sync_queue WHERE memo_id = ?', [memoId]);
  
  await database.runAsync(
    'INSERT INTO sync_queue (memo_id, action, created_at) VALUES (?, ?, ?)',
    [memoId, action, new Date().toISOString()]
  );
}

/**
 * Get all items in sync queue
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const database = getDatabase();
  const rows = await database.getAllAsync<{
    id: number;
    memo_id: string;
    action: string;
    created_at: string;
    retry_count: number;
    last_error: string | null;
  }>('SELECT * FROM sync_queue ORDER BY created_at ASC');

  return rows.map(row => ({
    id: row.id,
    memoId: row.memo_id,
    action: row.action as SyncAction,
    createdAt: row.created_at,
    retryCount: row.retry_count,
    lastError: row.last_error || undefined,
  }));
}

/**
 * Remove item from sync queue
 */
export async function removeFromSyncQueue(id: number): Promise<void> {
  const database = getDatabase();
  await database.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
}

/**
 * Update sync queue item on error
 */
export async function updateSyncQueueError(id: number, error: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync(
    'UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?',
    [error, id]
  );
}

// ============================================
// Helpers
// ============================================

interface MemoRow {
  id: string;
  server_id: string | null;
  content: string;
  visibility: string;
  pinned: number;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
  sync_status: string;
}

function rowToMemo(row: MemoRow): Memo {
  return {
    id: row.id,
    serverId: row.server_id || undefined,
    content: row.content,
    visibility: row.visibility as MemoVisibility,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncedAt: row.synced_at || undefined,
    syncStatus: row.sync_status as SyncStatus,
  };
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
