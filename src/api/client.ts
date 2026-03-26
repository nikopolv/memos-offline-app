import { ApiCurrentUser, ApiMemo, ApiMemoList, MemoCreate, MemoVisibility } from '../types';

export interface MemosClientConfig {
  baseUrl: string;
  token: string;
  userParent?: string;
}

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(`API Error ${status}: ${message}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

export class MemosClient {
  private baseUrl: string;
  private token: string;
  private memoParent: string | null;
  private memoParentCandidates: string[];

  constructor(config: MemosClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = config.token;
    this.memoParent = config.userParent ?? null;
    this.memoParentCandidates = Array.from(
      new Set([config.userParent, 'users/-', 'users/1'].filter((value): value is string => Boolean(value)))
    );
  }

  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new ApiError(response.status, responseText);
    }

    if (!responseText) {
      return undefined as T;
    }

    return JSON.parse(responseText) as T;
  }

  private async listMemosPage(
    pageToken?: string,
    pageSize = 50,
    filter?: string
  ): Promise<ApiMemoList> {
    const params = new URLSearchParams();
    params.set('pageSize', pageSize.toString());
    if (pageToken) {
      params.set('pageToken', pageToken);
    }
    if (filter) {
      params.set('filter', filter);
    }

    return this.fetch<ApiMemoList>(`/api/v1/memos?${params.toString()}`);
  }

  private async listMemosWithLegacyParent(
    parent: string,
    pageToken?: string,
    pageSize = 50
  ): Promise<ApiMemoList> {
    const params = new URLSearchParams();
    params.set('pageSize', pageSize.toString());
    params.set('parent', parent);
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    return this.fetch<ApiMemoList>(`/api/v1/memos?${params.toString()}`);
  }

  async getCurrentUser(): Promise<ApiCurrentUser['user']> {
    const response = await this.fetch<ApiCurrentUser>('/api/v1/auth/me');
    return response.user;
  }

  /**
   * List memos with optional pagination
   */
  async listMemos(pageToken?: string, pageSize = 50, filter?: string): Promise<ApiMemoList> {
    return this.listMemosPage(pageToken, pageSize, filter);
  }

  /**
   * Get all memos (handles pagination automatically)
   */
  async getAllMemos(): Promise<ApiMemo[]> {
    const collectAllPages = async (filter?: string): Promise<ApiMemo[]> => {
      const allMemos: ApiMemo[] = [];
      let pageToken: string | undefined;

      do {
        const response = await this.listMemos(pageToken, 50, filter);
        allMemos.push(...response.memos);
        pageToken = response.nextPageToken;
      } while (pageToken);

      return allMemos;
    };

    const collectAllPagesWithLegacyParent = async (parent: string): Promise<ApiMemo[]> => {
      const allMemos: ApiMemo[] = [];
      let pageToken: string | undefined;

      do {
        const response = await this.listMemosWithLegacyParent(parent, pageToken, 50);
        allMemos.push(...response.memos);
        pageToken = response.nextPageToken;
      } while (pageToken);

      return allMemos;
    };

    const defaultMemos = await collectAllPages();
    if (defaultMemos.length > 0) {
      return defaultMemos;
    }

    try {
      const currentUser = await this.getCurrentUser();
      const creatorFilters = new Set<string>();
      creatorFilters.add(`creator == "${currentUser.name}"`);

      const numericIdMatch = currentUser.name.match(/^users\/(\d+)$/);
      if (numericIdMatch) {
        creatorFilters.add(`creator_id == ${numericIdMatch[1]}`);
      }

      for (const filter of creatorFilters) {
        try {
          const filteredMemos = await collectAllPages(filter);
          if (filteredMemos.length > 0) {
            return filteredMemos;
          }
        } catch {
          // Ignore filter incompatibilities and try the next fallback.
        }
      }
    } catch {
      // Older Memos servers may not implement /api/v1/auth/me.
      // Fall through to the legacy parent-based listing strategy below.
    }

    for (const parent of this.memoParentCandidates) {
      try {
        const parentScopedMemos = await collectAllPagesWithLegacyParent(parent);
        if (parentScopedMemos.length > 0) {
          this.memoParent = parent;
          return parentScopedMemos;
        }
      } catch {
        // Ignore unsupported parent query variants and keep trying fallbacks.
      }
    }

    return defaultMemos;
  }

  /**
   * Create a new memo
   */
  async createMemo(memo: MemoCreate): Promise<ApiMemo> {
    return this.fetch<ApiMemo>('/api/v1/memos', {
      method: 'POST',
      body: JSON.stringify({
        content: memo.content,
        visibility: memo.visibility || 'PRIVATE',
      }),
    });
  }

  /**
   * Update an existing memo
   */
  async updateMemo(
    name: string,
    updates: { content?: string; visibility?: MemoVisibility; pinned?: boolean }
  ): Promise<ApiMemo> {
    const updateMask: string[] = [];
    if (updates.content !== undefined) updateMask.push('content');
    if (updates.visibility !== undefined) updateMask.push('visibility');
    if (updates.pinned !== undefined) updateMask.push('pinned');

    return this.fetch<ApiMemo>(`/api/v1/${name}?updateMask=${updateMask.join(',')}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a memo
   */
  async deleteMemo(name: string): Promise<void> {
    await this.fetch(`/api/v1/${name}`, {
      method: 'DELETE',
    });
  }

  /**
   * Test connection by fetching memos list
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listMemos(undefined, 1);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let clientInstance: MemosClient | null = null;

export function initializeClient(config: MemosClientConfig): MemosClient {
  clientInstance = new MemosClient(config);
  return clientInstance;
}

export function getClient(): MemosClient {
  if (!clientInstance) {
    throw new Error('Memos client not initialized. Call initializeClient first.');
  }
  return clientInstance;
}
