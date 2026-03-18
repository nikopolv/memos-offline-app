import { ApiMemo, ApiMemoList, MemoCreate, MemoVisibility } from '../types';

export interface MemosClientConfig {
  baseUrl: string;
  token: string;
}

export class MemosClient {
  private baseUrl: string;
  private token: string;

  constructor(config: MemosClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = config.token;
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

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error ${response.status}: ${error}`);
    }

    return response.json();
  }

  /**
   * List memos with optional pagination
   */
  async listMemos(pageToken?: string, pageSize = 50): Promise<ApiMemoList> {
    const params = new URLSearchParams();
    params.set('pageSize', pageSize.toString());
    if (pageToken) {
      params.set('pageToken', pageToken);
    }

    return this.fetch<ApiMemoList>(`/api/v1/memos?${params}`);
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
   * Test connection / get user profile
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.fetch('/api/v1/users/me');
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
