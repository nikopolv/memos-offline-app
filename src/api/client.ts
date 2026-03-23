import { ApiMemo, ApiMemoList, MemoCreate, MemoVisibility } from '../types';

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

  private async resolveMemoParent(): Promise<string> {
    if (this.memoParent) {
      return this.memoParent;
    }

    let lastError: Error | null = null;

    for (const parent of this.memoParentCandidates) {
      try {
        await this.listMemosWithParent(parent, undefined, 1);
        this.memoParent = parent;
        return parent;
      } catch (error) {
        if (error instanceof ApiError && [400, 403, 404].includes(error.status)) {
          lastError = error;
          continue;
        }

        throw error;
      }
    }

    throw lastError ?? new Error('Unable to determine memo parent for authenticated user');
  }

  private async listMemosWithParent(
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

  /**
   * List memos with optional pagination
   */
  async listMemos(pageToken?: string, pageSize = 50): Promise<ApiMemoList> {
    const parent = await this.resolveMemoParent();
    return this.listMemosWithParent(parent, pageToken, pageSize);
  }

  /**
   * Get all memos (handles pagination automatically)
   */
  async getAllMemos(): Promise<ApiMemo[]> {
    const allMemos: ApiMemo[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.listMemos(pageToken);
      allMemos.push(...response.memos);
      pageToken = response.nextPageToken;
    } while (pageToken);

    return allMemos;
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
