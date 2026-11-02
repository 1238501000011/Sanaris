import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { openComplaintStore } from '../server/complaints.js';
import { createApi } from '../server/api.js';

test('GitHub Pages origin uses preflight, bearer admin access, shared reporting, and revocable sessions', async () => {
  const origin = 'https://test-sanaris.github.io';
  const api = createApi({ databasePath: ':memory:', allowedOrigins: [origin], initialPassword: 'Isolated API test password 42' });
  const server = createServer(api.handle);
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  const request = (path, { method = 'GET', data, headers = {} } = {}) => fetch(base + path, {
    method,
    headers: { Origin: origin, 'Sec-Fetch-Site': 'cross-site', ...(data ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: data ? JSON.stringify(data) : undefined
  });
  try {
    const preflight = await request('/api/admin/login', { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-sanaris-auth' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/);
    const rejected = await request('/api/admin/session', { headers: { Origin: 'https://unrelated.example' } });
    assert.equal(rejected.status, 403);
    assert.equal(rejected.headers.has('access-control-allow-origin'), false);
    const inbox = await (await request('/api/admin/complaints')).json();
    assert.equal(inbox.length, 0);
    assert.equal((await request('/api/admin/session', { headers: { Origin: 'null' } })).status, 403);
  } finally { api.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('origin allowlists reject wildcards and paths rather than silently exposing the service', () => {
  for (const origin of ['*', 'https://example.github.io/sanaris-dashboard/', 'https://example.github.io/']) {
    assert.throws(() => createApi({ databasePath: ':memory:', allowedOrigins: [origin] }));
  }
});

test('a hosting initialization password never changes an existing database password', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'sanaris-initial-password-'));
  const databasePath = join(folder, 'reports.sqlite');
  try {
    createApi({ databasePath, initialPassword: 'Original test password 1234' }).close();
    createApi({ databasePath, initialPassword: 'Replacement should be ignored 1234' }).close();
    const store = openComplaintStore(databasePath);
    try {
      assert.equal(store.verifyPassword('Original test password 1234'), true);
      assert.equal(store.verifyPassword('Replacement should be ignored 1234'), false);
    } finally { store.close(); }
  } finally {
    if (dirname(folder) === resolve(tmpdir()) && basename(folder).startsWith('sanaris-initial-password-')) await rm(folder, { recursive: true, force: true });
  }
});
