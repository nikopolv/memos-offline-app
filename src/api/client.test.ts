import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemosClient } from './client';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

test('listMemos uses the documented memos endpoint without a parent query', async () => {
  const requestedUrls: string[] = [];

  global.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    requestedUrls.push(url);

    return new Response(JSON.stringify({ memos: [], nextPageToken: '' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  const client = new MemosClient({
    baseUrl: 'https://memos.example.com/',
    token: 'token',
  });

  await client.listMemos();
  await client.listMemos('next-page');

  assert.equal(requestedUrls.length, 2);
  assert.doesNotMatch(requestedUrls[0], /parent=/);
  assert.doesNotMatch(requestedUrls[1], /parent=/);
  assert.match(requestedUrls[1], /pageToken=next-page/);
});

test('getAllMemos falls back to the current user filter when the plain list is empty', async () => {
  const requestedUrls: string[] = [];

  global.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    requestedUrls.push(url);

    if (url.includes('/api/v1/auth/me')) {
      return new Response(
        JSON.stringify({
          user: {
            name: 'users/101',
            role: 'USER',
            username: 'niko',
            state: 'NORMAL',
            createTime: '2026-01-01T00:00:00Z',
            updateTime: '2026-01-01T00:00:00Z',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('filter=')) {
      return new Response(
        JSON.stringify({
          memos: [
            {
              name: 'memos/demo',
              state: 'NORMAL',
              creator: 'users/101',
              createTime: '2026-01-01T00:00:00Z',
              updateTime: '2026-01-01T00:00:00Z',
              displayTime: '2026-01-01T00:00:00Z',
              content: 'hello',
              visibility: 'PRIVATE',
              tags: [],
              pinned: false,
              resources: [],
              relations: [],
              reactions: [],
            },
          ],
          nextPageToken: '',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ memos: [], nextPageToken: '' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  const client = new MemosClient({
    baseUrl: 'https://memos.example.com/',
    token: 'token',
  });

  const memos = await client.getAllMemos();

  assert.equal(memos.length, 1);
  assert.equal(memos[0]?.name, 'memos/demo');
  assert.equal(requestedUrls[0]?.includes('/api/v1/memos?pageSize=50'), true);
  assert.equal(requestedUrls.some((url) => url.includes('/api/v1/auth/me')), true);
  assert.equal(
    requestedUrls.some((url) => url.includes('filter=creator+%3D%3D+%22users%2F101%22')),
    true
  );
});

test('getAllMemos falls back to legacy parent queries when auth me is unavailable', async () => {
  const requestedUrls: string[] = [];

  global.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    requestedUrls.push(url);

    if (url.includes('/api/v1/auth/me')) {
      return new Response(JSON.stringify({ code: 5, message: 'Not Found', details: [] }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('parent=users%2F1')) {
      return new Response(
        JSON.stringify({
          memos: [
            {
              name: 'memos/legacy',
              state: 'NORMAL',
              creator: 'users/1',
              createTime: '2026-01-01T00:00:00Z',
              updateTime: '2026-01-01T00:00:00Z',
              displayTime: '2026-01-01T00:00:00Z',
              content: 'legacy memo',
              visibility: 'PRIVATE',
              tags: [],
              pinned: false,
              resources: [],
              relations: [],
              reactions: [],
            },
          ],
          nextPageToken: '',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ memos: [], nextPageToken: '' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  const client = new MemosClient({
    baseUrl: 'https://memos.example.com/',
    token: 'token',
  });

  const memos = await client.getAllMemos();

  assert.equal(memos.length, 1);
  assert.equal(memos[0]?.name, 'memos/legacy');
  assert.equal(requestedUrls.some((url) => url.includes('/api/v1/auth/me')), true);
  assert.equal(requestedUrls.some((url) => url.includes('parent=users%2F1')), true);
});

test('deleteMemo succeeds when the API returns an empty successful response body', async () => {
  global.fetch = (async () => new Response(null, { status: 200 })) as typeof fetch;

  const client = new MemosClient({
    baseUrl: 'https://memos.example.com/',
    token: 'token',
    userParent: 'users/1',
  });

  await assert.doesNotReject(async () => {
    await client.deleteMemo('memos/abc123');
  });
});
