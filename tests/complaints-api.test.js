import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApi } from '../server/api.js';

test('separate resident and admin clients share reports, receive updates, and enforce admin access', async () => {
  const api = createApi({ databasePath: ':memory:' });
  const server = createServer(api.handle);
  const abort = new AbortController();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  let cookie = '';
  async function request(path, { admin = false, method = 'GET', data, headers = {} } = {}) {
    return fetch(base + path, { method, headers: { ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(admin ? { Cookie: cookie } : {}), ...headers }, body: data !== undefined ? JSON.stringify(data) : undefined });
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
    assert.deepEqual(await (await request('/api/admin/session')).json(), { authenticated: false, setupRequired: true });
    assert.equal((await request('/api/admin/complaints')).status, 401);
    assert.equal((await request('/api/admin/complaints/events')).status, 401);
    assert.equal((await request('/api/complaints')).status, 404);
    assert.equal((await request('/api/admin/setup', { method: 'POST', data: null })).status, 400);
    assert.equal((await request('/api/admin/setup', { method: 'POST', data: { password: 'Test password 1234' }, headers: { Origin: 'https://unrelated.example' } })).status, 403);
    const setup = await request('/api/admin/setup', { method: 'POST', data: { password: 'Test password 1234' } });
    assert.equal(setup.status, 201);
    assert.match(setup.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
    cookie = setup.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/api/admin/login', { method: 'POST', data: { password: 'wrong' } })).status, 401);
    assert.equal((await request('/api/admin/setup', { method: 'POST', data: { password: 'Test password 5678' } })).status, 409);
    const adminStream = await fetch(base + '/api/admin/complaints/events', { headers: { Cookie: cookie }, signal: abort.signal });
    const adminReader = adminStream.body.getReader();
    await readEvent(adminReader, 'ready');
    const data = { location: 'Test address', category: 'Other', description: 'An isolated integration test report.', incidentAt: new Date(Date.now() - 60000).toISOString() };
    const key = randomUUID();
    const submitted = await request('/api/complaints', { method: 'POST', data, headers: { 'Idempotency-Key': key } });
    assert.equal(submitted.status, 201);
    const receipt = await submitted.json();
    const event = await readEvent(adminReader, 'complaints-changed');
    assert.equal(event.includes(data.location), false);
    assert.equal((await request('/api/complaints', { method: 'POST', data, headers: { 'Idempotency-Key': key } })).status, 200);
    const inbox = await (await request('/api/admin/complaints', { admin: true })).json();
    assert.equal(inbox.length, 1);
    assert.equal(inbox[0].id, receipt.id);
    assert.equal(inbox[0].location, data.location);
    assert.equal((await request('/api/admin/complaints/' + receipt.id, { method: 'PATCH', data: { status: 'Resolved' } })).status, 401);
    const residentStream = await fetch(base + '/api/complaints/' + receipt.id + '/events', { signal: abort.signal });
    const residentReader = residentStream.body.getReader();
    await readEvent(residentReader, 'ready');
    assert.equal((await request('/api/admin/complaints/' + receipt.id, { admin: true, method: 'PATCH', data: { status: 'Resolved' } })).status, 200);
    await readEvent(residentReader, 'complaints-changed');
    const tracking = await (await request('/api/complaints/' + receipt.id)).json();
    assert.equal(tracking.status, 'Resolved');
    assert.equal(tracking.updates.length, 2);
    assert.equal('description' in tracking, false);
    assert.equal('location' in tracking, false);
    assert.equal((await request('/api/admin/logout', { admin: true, method: 'POST' })).status, 200);
    assert.equal((await request('/api/admin/complaints', { admin: true })).status, 401);
  } finally {
    abort.abort();
    api.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
