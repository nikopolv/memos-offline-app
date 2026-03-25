// Memo types matching Memos API v1

export type MemoVisibility = 'PRIVATE' | 'PROTECTED' | 'PUBLIC';

export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'deleted';

export interface Memo {
  // Local ID (UUID)
  id: string;
  // Server ID (from Memos API, e.g., "memos/abc123")
  serverId?: string;
  // Memo content (Markdown)
  content: string;
  // Visibility setting
  visibility: MemoVisibility;
  // Pinned status
  pinned: boolean;
  // Timestamps
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  // Sync metadata
  syncedAt?: string; // Last successful sync
  syncStatus: SyncStatus;
}

export interface MemoCreate {
  content: string;
  visibility?: MemoVisibility;
}

export interface MemoUpdate {
  id: string;
  content?: string;
  visibility?: MemoVisibility;
  pinned?: boolean;
}

// API response types
export interface ApiMemo {
  name: string; // e.g., "memos/abc123"
  state: string;
  creator: string;
  createTime: string;
  updateTime: string;
  displayTime: string;
  content: string;
  visibility: MemoVisibility;
  tags: string[];
  pinned: boolean;
  resources: unknown[];
  relations: unknown[];
  reactions: unknown[];
}

export interface ApiMemoList {
  memos: ApiMemo[];
  nextPageToken?: string;
}

export interface ApiCurrentUser {
  user: {
    name: string;
    role: string;
    username: string;
    email?: string;
    displayName?: string;
    avatarUrl?: string;
    description?: string;
    state: string;
    createTime: string;
    updateTime: string;
  };
}

// Tag type
export interface Tag {
  id: number;
  name: string;
  count?: number;
}
