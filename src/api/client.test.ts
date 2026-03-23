import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { MemosClient } from './client';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

test('listMemos falls back from generic parent to users/1 and caches the resolved parent', async () => {
  const requestedUrls: string[] = [];

  global.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    requestedUrls.push(url);

    if (url.includes('parent=users%2F-')) {
      return new Response('parent not supported', { status: 400 });
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

  await client.listMemos();
  await client.listMemos('next-page');

  assert.equal(requestedUrls.length, 4);
  assert.match(requestedUrls[0], /parent=users%2F-/);
  assert.match(requestedUrls[1], /parent=users%2F1/);
  assert.match(requestedUrls[2], /parent=users%2F1/);
  assert.match(requestedUrls[3], /parent=users%2F1/);
  assert.match(requestedUrls[3], /pageToken=next-page/);
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
