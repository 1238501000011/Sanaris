import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openComplaintStore } from '../server/complaints.js';

const report = () => ({ location: 'Test location', category: 'Vehicle noise', description: 'A test report for automated verification.', incidentAt: new Date(Date.now() - 60000).toISOString() });

test('reports and admin credentials survive a restart; retries do not duplicate or overwrite reports', () => {
  const folder = mkdtempSync(join(tmpdir(), 'sanaris-store-test-'));
  const file = join(folder, 'test.sqlite');
  let store = openComplaintStore(file);
  try {
    const data = report();
    const key = randomUUID();
    store.setPassword('Test admin password 1234');
    const { item } = store.submit(data, key);
    assert.match(item.id, /^SAN-\d{4}-[A-F0-9]{24}$/);
    assert.equal(store.submit(data, key).created, false);
    assert.throws(() => store.submit({ ...data, location: 'Another location' }, key), { status: 409 });
    store.update(item.id, 'Resolved');
    store.update(item.id, 'Resolved');
    store.close();
    store = openComplaintStore(file);
    assert.equal(store.list().length, 1);
    assert.equal(store.find(item.id).status, 'Resolved');
    assert.equal(store.find(item.id).updates.length, 2);
    assert.equal(store.verifyPassword('Test admin password 1234'), true);
    assert.equal(store.verifyPassword('incorrect'), false);
    assert.throws(() => store.setPassword('Another test password'), { status: 409 });
    assert.throws(() => store.update(item.id, 'Invalid'), { status: 400 });
  } finally {
    store.close();
    if (dirname(folder) === resolve(tmpdir()) && basename(folder).startsWith('sanaris-store-test-')) rmSync(folder, { recursive: true, force: true });
  }
});

test('invalid reports are rejected and legacy imports preserve existing shared status', () => {
  const store = openComplaintStore(':memory:');
  try {
    for (const bad of [null, {}, [], { ...report(), location: ' ' }, { ...report(), description: 'short' }, { ...report(), category: 'invalid' }, { ...report(), incidentAt: new Date(Date.now() + 3600000).toISOString() }]) {
      assert.throws(() => store.submit(bad, randomUUID()), { status: 400 });
    }
    const legacy = { ...report(), id: 'SAN-2026-ABCDEF123456', status: 'Submitted', createdAt: new Date().toISOString(), updates: [{ status: 'Submitted', at: new Date().toISOString() }] };
    assert.equal(store.importReports([legacy]), 1);
    store.update(legacy.id, 'In progress');
    assert.equal(store.importReports([legacy]), 0);
    assert.equal(store.find(legacy.id).status, 'In progress');
    assert.throws(() => store.importReports([{ ...legacy, id: 'SAN-2026-ABCDEF123457' }, { ...legacy, description: '' }]), { status: 400 });
    assert.equal(store.list().length, 1);
  } finally { store.close(); }
});
