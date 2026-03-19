import { create } from 'zustand';
import { Memo, MemoCreate, ApiMemo } from '../types';
import * as db from '../db';
import { getClient } from '../api';

interface MemoState {
  memos: Memo[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filterTag: string | null;

  // Actions
  loadMemos: () => Promise<void>;
  createMemo: (content: string) => Promise<Memo>;
  updateMemo: (id: string, content: string) => Promise<void>;
  deleteMemo: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setFilterTag: (tag: string | null) => void;
  clearError: () => void;

  // Sync
  syncFromServer: () => Promise<void>;
  getFilteredMemos: () => Memo[];
}

export const useMemoStore = create<MemoState>((set, get) => ({
  memos: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  filterTag: null,

  loadMemos: async () => {
    try {
      set({ isLoading: true, error: null });
      const memos = await db.getMemos();
      set({ memos, isLoading: false });
    } catch (error) {
      console.error('Load memos error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load memos',
      });
    }
  },

  createMemo: async (content: string) => {
    try {
      const memo = await db.insertMemo({
        content,
        visibility: 'PRIVATE',
        pinned: false,
        syncStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Add to sync queue
      await db.addToSyncQueue(memo.id, 'create');

      // Update state
      set((state) => ({
        memos: [memo, ...state.memos],
      }));

      return memo;
    } catch (error) {
      console.error('Create memo error:', error);
      throw error;
    }
  },

  updateMemo: async (id: string, content: string) => {
    try {
      await db.updateMemo(id, { content, syncStatus: 'pending' });
      await db.addToSyncQueue(id, 'update');

      set((state) => ({
        memos: state.memos.map((m) =>
          m.id === id
            ? { ...m, content, updatedAt: new Date().toISOString(), syncStatus: 'pending' as const }
            : m
        ),
      }));
    } catch (error) {
      console.error('Update memo error:', error);
      throw error;
    }
  },

  deleteMemo: async (id: string) => {
    try {
      const memo = get().memos.find((m) => m.id === id);
      
      if (memo?.serverId) {
        // Mark for server deletion
        await db.updateMemo(id, { syncStatus: 'deleted' });
        await db.addToSyncQueue(id, 'delete');
      } else {
        // Local only, just delete
        await db.deleteMemo(id);
      }

      set((state) => ({
        memos: state.memos.filter((m) => m.id !== id),
      }));
    } catch (error) {
      console.error('Delete memo error:', error);
      throw error;
    }
  },

  togglePin: async (id: string) => {
    try {
      const memo = get().memos.find((m) => m.id === id);
      if (!memo) return;

      const newPinned = !memo.pinned;
      await db.updateMemo(id, { pinned: newPinned, syncStatus: 'pending' });
      
      if (memo.serverId) {
        await db.addToSyncQueue(id, 'update');
      }

      set((state) => ({
        memos: state.memos.map((m) =>
          m.id === id ? { ...m, pinned: newPinned, syncStatus: 'pending' as const } : m
        ),
      }));
    } catch (error) {
      console.error('Toggle pin error:', error);
      throw error;
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setFilterTag: (tag: string | null) => set({ filterTag: tag }),

  clearError: () => set({ error: null }),

  syncFromServer: async () => {
    try {
      set({ isLoading: true, error: null });

      const client = getClient();
      const serverMemos = await client.getAllMemos();

      // Upsert server memos to local DB
      for (const apiMemo of serverMemos) {
        const existing = get().memos.find((m) => m.serverId === apiMemo.name);
        
        if (existing) {
          // Update existing memo if server version is newer
          const serverUpdated = new Date(apiMemo.updateTime);
          const localUpdated = new Date(existing.updatedAt);
          
          if (serverUpdated > localUpdated && existing.syncStatus === 'synced') {
            await db.updateMemo(existing.id, {
              content: apiMemo.content,
              visibility: apiMemo.visibility,
              pinned: apiMemo.pinned,
              syncStatus: 'synced',
              syncedAt: new Date().toISOString(),
            });
          }
        } else {
          // Insert new memo from server
          await db.insertMemo({
            serverId: apiMemo.name,
            content: apiMemo.content,
            visibility: apiMemo.visibility,
            pinned: apiMemo.pinned,
            createdAt: apiMemo.createTime,
            updatedAt: apiMemo.updateTime,
            syncStatus: 'synced',
            syncedAt: new Date().toISOString(),
          });
        }
      }

      // Reload memos from DB
      const memos = await db.getMemos();
      set({ memos, isLoading: false });
    } catch (error) {
      console.error('Sync from server error:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      });
    }
  },

  getFilteredMemos: () => {
    const { memos, searchQuery, filterTag } = get();

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const searchTerms = normalizedQuery.length
      ? normalizedQuery.split(/\s+/).filter(Boolean)
      : [];

    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return memos
      .filter((memo) => {
        const content = memo.content.toLowerCase();

        // Local full-text style search:
        // - split query into terms
        // - every term must match either a word prefix or substring
        if (searchTerms.length > 0) {
          const words = content.split(/\W+/).filter(Boolean);
          const matchesAllTerms = searchTerms.every((term) => {
            return words.some((word) => word.startsWith(term)) || content.includes(term);
          });

          if (!matchesAllTerms) {
            return false;
          }
        }

        // Tag filter
        if (filterTag) {
          const escapedTag = escapeRegExp(filterTag);
          const tagPattern = new RegExp(`#${escapedTag}\\b`, 'i');
          if (!tagPattern.test(memo.content)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }

        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  },
}));
