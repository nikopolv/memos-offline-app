import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCESS_TOKEN_INPUT_BEHAVIOR,
  SERVER_URL_INPUT_BEHAVIOR,
  canSubmitLoginCredentials,
  normalizeLoginCredentials,
  normalizeServerUrl,
} from './loginCredentials';

test('login input behavior disables auto-formatting for URL and token fields', () => {
  assert.deepEqual(SERVER_URL_INPUT_BEHAVIOR, {
    autoCapitalize: 'none',
    autoCorrect: false,
  });

  assert.deepEqual(ACCESS_TOKEN_INPUT_BEHAVIOR, {
    autoCapitalize: 'none',
    autoCorrect: false,
  });
});

test('normalizeServerUrl trims, prepends protocol, and strips trailing slashes', () => {
  assert.equal(normalizeServerUrl('  memos.example.com///  '), 'https://memos.example.com');
  assert.equal(normalizeServerUrl(' http://memos.example.com// '), 'http://memos.example.com');
  assert.equal(normalizeServerUrl(' https://memos.example.com/path '), 'https://memos.example.com/path');
  assert.equal(normalizeServerUrl('   '), '');
});

test('normalizeLoginCredentials normalizes server URL and trims token', () => {
  const normalized = normalizeLoginCredentials('  memos.example.com///  ', '  token-value  ');

  assert.equal(normalized.serverUrl, 'https://memos.example.com');
  assert.equal(normalized.token, 'token-value');
});

test('canSubmitLoginCredentials returns false for blank credentials and true for normalized values', () => {
  assert.equal(canSubmitLoginCredentials('', ''), false);
  assert.equal(canSubmitLoginCredentials('   ', 'token'), false);
  assert.equal(canSubmitLoginCredentials('https://memos.example.com', '   '), false);
  assert.equal(canSubmitLoginCredentials(' memos.example.com/// ', ' token '), true);
});
