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
