import test from 'node:test';
import assert from 'node:assert/strict';

let moduleId = 0;
const reloadClient = () => import('../docs/assets/js/api.js?session-test=' + ++moduleId);
function browser(t, { blocked = false } = {}) {
  const values = new Map();
  const original = new Map(['location', 'sessionStorage', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const storage = {
    getItem(key) { if (blocked) throw new Error('Storage blocked'); return values.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw new Error('Storage blocked'); values.set(key, value); },
    removeItem(key) { if (blocked) throw new Error('Storage blocked'); values.delete(key); },
  };
  Object.defineProperty(globalThis, 'location', { value: new URL('http://127.0.0.1:5173/#/admin/map'), writable: true, configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', { value: storage, writable: true, configurable: true });
  t.after(() => {
    for (const [key, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  return values;
}

test('reload restores the tab token and asks the server to validate it; logout removes it', async t => {
  const values = browser(t);
  const first = await reloadClient(); first.setToken('valid-session');
  assert.equal([...values.values()][0], 'valid-session');
  const restored = await reloadClient();
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer valid-session');
    return Response.json({ authenticated: !url.pathname.endsWith('/logout') });
  };
  assert.equal((await restored.requestApi('/api/admin/session')).authenticated, true);
  await restored.requestApi('/api/admin/logout', { method: 'POST' });
  assert.equal(values.size, 0);
  globalThis.fetch = async (url, options) => { assert.equal(options.headers.Authorization, undefined); return Response.json({ authenticated: false }); };
  assert.equal((await (await reloadClient()).requestApi('/api/admin/session')).authenticated, false);
});

test('rejected or expired server sessions clear the stored token', async t => {
  const values = browser(t);
  const client = await reloadClient();
  for (const status of [401, 403, 200]) {
    client.setToken('expired-session');
    globalThis.fetch = async () => Response.json(status === 200 ? { authenticated: false } : { error: 'Session ended' }, { status });
    if (status === 200) await client.requestApi('/api/admin/session');
    else await assert.rejects(client.requestApi('/api/admin/session'), error => error.status === status);
    assert.equal(values.size, 0);
  }
});

test('temporary service errors retain the token and public requests omit admin credentials', async t => {
  const values = browser(t);
  const client = await reloadClient(); client.setToken('retry-session');
  globalThis.fetch = async () => Response.json({ error: 'Unavailable' }, { status: 503 });
  await assert.rejects(client.requestApi('/api/admin/session'));
  assert.equal([...values.values()][0], 'retry-session');
  globalThis.fetch = async () => { throw new TypeError('Network error'); };
  await assert.rejects(client.requestApi('/api/admin/session'));
  assert.equal([...values.values()][0], 'retry-session');
  globalThis.fetch = async (url, options) => { assert.equal(options.headers.Authorization, undefined); return Response.json({ error: 'Not found' }, { status: 404 }); };
  await assert.rejects(client.requestApi('/api/complaints/SAN-2026-ABCDEFABCDEF'));
  assert.equal([...values.values()][0], 'retry-session');
});

test('an older failed request cannot erase a newer login', async t => {
  const values = browser(t);
  const client = await reloadClient(); client.setToken('old-session');
  let finish;
  globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
  const pending = client.requestApi('/api/admin/complaints');
  client.setToken('new-session');
  finish(Response.json({ error: 'Old session expired' }, { status: 401 }));
  await assert.rejects(pending);
  assert.equal([...values.values()][0], 'new-session');
});

test('tokens belong to one API address and blocked storage keeps sign-in usable', async t => {
  const values = browser(t);
  (await reloadClient()).setToken('backend-one-session');
  globalThis.location = new URL('http://127.0.0.1:5189/#/admin/overview');
  const other = await reloadClient();
  globalThis.fetch = async (url, options) => { assert.equal(options.headers.Authorization, undefined); return Response.json({ authenticated: false }); };
  await other.requestApi('/api/admin/session');
  assert.equal([...values.values()][0], 'backend-one-session');
});

test('storage restrictions fall back to an in-memory sign-in', async t => {
  browser(t, { blocked: true });
  const client = await reloadClient(); client.setToken('memory-session');
  globalThis.fetch = async (url, options) => { assert.equal(options.headers.Authorization, 'Bearer memory-session'); return Response.json({ authenticated: true }); };
  assert.equal((await client.requestApi('/api/admin/session')).authenticated, true);
  client.setToken('');
});
