import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../supabase/functions/sanaris-api/handler.js';

function fixture() {
  let record, allowed = true, revoked = false, limited = false, calls = 0;
  const handler = createHandler({ url: 'https://example.supabase.co', key: 'server-secret', origins: ['https://1238501000011.github.io'], fetcher: async (url, options) => {
    calls++;
    const body = JSON.parse(options.body || '{}');
    let result;
    if (url.includes('/auth/v1/token')) result = { access_token: 'valid-token' };
    else if (url.endsWith('/auth/v1/user')) {
      if (options.headers.Authorization !== 'Bearer valid-token') return Response.json({}, { status: 401 });
      result = { id: 'admin-user' };
    } else {
      const { action, payload } = body;
      if (action === 'authorize') result = allowed && !revoked;
      if (action === 'revoke') { revoked = true; result = true; }
      if (action === 'rate') result = !limited;
      if (action === 'submit') {
        const created = !record;
        record ||= { ...payload.report, id: 'SAN-2026-ABCDEF123456ABCDEF123456', createdAt: new Date().toISOString(), status: 'Submitted', updates: [] };
        result = { item: record, created };
      }
      if (action === 'find') result = record;
      if (action === 'list') result = record ? [record] : [];
      if (action === 'update') { record = { ...record, status: payload.status }; result = record; }
    }
    return Response.json(result ?? null);
  }});
  const request = (path, { method = 'GET', body, token, origin = 'https://1238501000011.github.io', key = 'request-key-00000001' } = {}) => handler(new Request('https://example.supabase.co/functions/v1/sanaris-api/api/' + path, {
    method, headers: { Origin: origin, 'Content-Type': 'application/json', 'Idempotency-Key': key, ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body),
  }));
  return { request, deny() { allowed = false; }, limit() { limited = true; }, calls: () => calls };
}
const report = { location: 'Private location', description: 'A private complaint description', category: 'Other', incidentAt: '2026-01-01T00:00:00Z' };
test('cloud resident submission and tracking expose status only; admin access requires membership', async () => {
  const { request, deny } = fixture();
  assert.equal((await request('admin/complaints')).status, 401);
  assert.equal((await request('admin/complaints', { token: 'invalid' })).status, 401);
  const session = await (await request('admin/session')).json(); assert.equal(session.authMode, 'email'); assert.equal(session.authenticated, false);
  const submitted = await request('complaints', { method: 'POST', body: report }); assert.equal(submitted.status, 201);
  const receipt = await submitted.json(); assert.equal(receipt.location, undefined); assert.equal(receipt.description, undefined);
  assert.equal((await request('complaints', { method: 'POST', body: report })).status, 200);
  assert.deepEqual(await (await request('complaints/' + receipt.id)).json(), receipt);
  const login = await (await request('admin/login', { method: 'POST', body: { email: 'admin@example.com', password: 'test-password' } })).json();
  assert.equal(login.token, 'valid-token');
  const inbox = await (await request('admin/complaints', { token: login.token })).json(); assert.equal(inbox[0].location, report.location);
  await request('admin/complaints/' + receipt.id, { method: 'PATCH', token: login.token, body: { status: 'Resolved' } });
  assert.equal((await (await request('complaints/' + receipt.id)).json()).status, 'Resolved');
  deny(); assert.equal((await request('admin/complaints', { token: login.token })).status, 403);
});
test('cloud logout blocks token replay and CORS blocks unapproved sites', async () => {
  const f = fixture();
  assert.equal((await f.request('admin/logout', { method: 'POST', token: 'valid-token' })).status, 200);
  assert.equal((await f.request('admin/complaints', { token: 'valid-token' })).status, 403);
  const calls = f.calls(); assert.equal((await f.request('health', { origin: 'https://evil.example' })).status, 403); assert.equal(f.calls(), calls);
  const preflight = await f.request('complaints', { method: 'OPTIONS' }); assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://1238501000011.github.io');
});
test('cloud validates input, enforces limits, and fails closed on upstream failure', async () => {
  const f = fixture();
  assert.equal((await f.request('complaints', { method: 'POST', body: { ...report, description: 'short' } })).status, 400);
  assert.equal((await f.request('complaints', { method: 'POST', body: report, key: 'bad' })).status, 400);
  f.limit(); assert.equal((await f.request('complaints', { method: 'POST', body: report })).status, 429);
  const handler = createHandler({ url: 'https://example.com', key: 'secret', fetcher: async () => { throw new Error('sensitive upstream detail'); } });
  const response = await handler(new Request('https://example.com/api/admin/complaints', { headers: { Authorization: 'Bearer token' } }));
  assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('sensitive'));
});
