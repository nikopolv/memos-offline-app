import * as db from '../db';
import { getClient } from '../api';
import { isOnline } from '../utils/network';
import { SyncAction, SyncQueueItem } from '../db';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Process the sync queue
 */
export async function processSyncQueue(): Promise<SyncResult> {
  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  // Check network
  if (!(await isOnline())) {
    return { ...result, success: false, errors: ['No network connection'] };
  }

  const queue = await db.getSyncQueue();
  const client = getClient();

  for (const item of queue) {
    if (item.retryCount >= MAX_RETRIES) {
      result.failed++;
      result.errors.push(`Max retries exceeded for memo ${item.memoId}`);
      continue;
    }

    try {
      await processSyncItem(item, client);
      await db.removeFromSyncQueue(item.id);
      result.synced++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await db.updateSyncQueueError(item.id, errorMessage);
      result.failed++;
      result.errors.push(errorMessage);
      result.success = false;
    }
  }

  return result;
}

/**
 * Process a single sync queue item
 */
async function processSyncItem(item: SyncQueueItem, client: ReturnType<typeof getClient>): Promise<void> {
  const memo = await db.getMemoById(item.memoId);

  switch (item.action) {
    case 'create':
      if (!memo) return; // Memo was deleted locally
      
      const created = await client.createMemo({ content: memo.content });
      await db.updateMemo(memo.id, {
        serverId: created.name,
        syncStatus: 'synced',
        syncedAt: new Date().toISOString(),
      });
      break;

    case 'update':
      if (!memo || !memo.serverId) return;
      
      await client.updateMemo(memo.serverId, {
        content: memo.content,
        pinned: memo.pinned,
        visibility: memo.visibility,
      });
      await db.updateMemo(memo.id, {
        syncStatus: 'synced',
        syncedAt: new Date().toISOString(),
      });
      break;

    case 'delete':
      if (!memo || !memo.serverId) {
        // Already deleted or never synced
        if (memo) await db.deleteMemo(memo.id);
        return;
      }
      
      await client.deleteMemo(memo.serverId);
      await db.deleteMemo(memo.id);
      break;
  }
}

/**
 * Full sync: pull from server + push local changes
 */
export async function fullSync(): Promise<SyncResult> {
  if (!(await isOnline())) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      errors: ['No network connection'],
    };
  }

  // First push local changes
  const pushResult = await processSyncQueue();

  // Then pull from server
  try {
    const client = getClient();
    const serverMemos = await client.getAllMemos();
    const localMemos = await db.getMemos();

    // Create a map of server memos by name
    const serverMemoMap = new Map(serverMemos.map((m) => [m.name, m]));
    const localMemoByServerId = new Map(
      localMemos.filter((m) => m.serverId).map((m) => [m.serverId, m])
    );

    // Update or insert server memos
    for (const serverMemo of serverMemos) {
      const localMemo = localMemoByServerId.get(serverMemo.name);

      if (localMemo) {
        // Only update if server is newer and local hasn't been modified
        if (localMemo.syncStatus === 'synced') {
          const serverTime = new Date(serverMemo.updateTime).getTime();
          const localTime = new Date(localMemo.updatedAt).getTime();

          if (serverTime > localTime) {
            await db.updateMemo(localMemo.id, {
              content: serverMemo.content,
              visibility: serverMemo.visibility,
              pinned: serverMemo.pinned,
              syncStatus: 'synced',
              syncedAt: new Date().toISOString(),
            });
          }
        }
      } else {
        // New memo from server
        await db.insertMemo({
          serverId: serverMemo.name,
          content: serverMemo.content,
          visibility: serverMemo.visibility,
          pinned: serverMemo.pinned,
          createdAt: serverMemo.createTime,
          updatedAt: serverMemo.updateTime,
          syncStatus: 'synced',
          syncedAt: new Date().toISOString(),
        });
      }
    }

    // Do not treat a missing memo in the pull response as a confirmed delete.
    // The API response can be partial or scoped to a different parent, and
    // deleting local rows here is destructive with no recovery path.

    return pushResult;
  } catch (error) {
    return {
      ...pushResult,
      success: false,
      errors: [
        ...pushResult.errors,
        error instanceof Error ? error.message : 'Pull sync failed',
      ],
    };
  }
}

/**
 * Get sync queue status
 */
export async function getSyncStatus(): Promise<{
  pendingCount: number;
  failedCount: number;
  items: SyncQueueItem[];
}> {
  const items = await db.getSyncQueue();
  return {
    pendingCount: items.filter((i) => i.retryCount < MAX_RETRIES).length,
    failedCount: items.filter((i) => i.retryCount >= MAX_RETRIES).length,
    items,
  };
}
