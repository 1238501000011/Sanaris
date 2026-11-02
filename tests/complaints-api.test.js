import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApi } from '../server/api.js';

test('admin clients manage reports directly without login', async () => {
  const api = createApi({ databasePath: ':memory:' });
  const server = createServer(api.handle);
  const abort = new AbortController();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  async function request(path, { method = 'GET', data, headers = {} } = {}) {
    return fetch(base + path, { method, headers: { ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, body: data !== undefined ? JSON.stringify(data) : undefined });
  }
  async function readEvent(reader, eventName) {
    let result = '';
    const timeout = setTimeout(() => abort.abort(), 5000);
    try {
      while (!result.includes('event: ' + eventName)) {
        const chunk = await reader.read();
        if (chunk.done) throw new Error('Event stream closed early');
        result += new TextDecoder().decode(chunk.value);
      }
      return result;
    } finally { clearTimeout(timeout); }
  }
  try {
    assert.deepEqual(await (await request('/api/admin/session')).json(), { authenticated: true, setupRequired: false });
    assert.equal((await request('/api/complaints')).status, 404);
    const adminStream = await fetch(base + '/api/admin/complaints/events', { signal: abort.signal });
    const adminReader = adminStream.body.getReader();
    await readEvent(adminReader, 'ready');
    const inbox = await (await request('/api/admin/complaints')).json();
    assert.equal(inbox.length, 0);
  } finally {
    abort.abort();
    api.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
