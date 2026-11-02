import test from 'node:test';
import assert from 'node:assert/strict';
import { validateResidentReport, localDateTime, referencePattern } from '../src/lib/residentForm.js';

test('resident form identifies missing details and consent before submission', () => {
  const errors = validateResidentReport({ location: '  ', category: '', incidentAt: '', description: ' short ', consent: false });
  assert.deepEqual(Object.keys(errors), ['location', 'category', 'incidentAt', 'description', 'consent']);
});

test('resident time shortcut produces a valid local incident time and future dates are rejected', () => {
  const now = new Date();
  const draft = { location: 'Test landmark', category: 'Other', incidentAt: localDateTime(now), description: 'A test concern with enough detail.', consent: true };
  assert.deepEqual(validateResidentReport(draft, now.getTime()), {});
  assert.ok(Math.abs(new Date(draft.incidentAt).getTime() - now.getTime()) < 60_000);
  assert.ok(validateResidentReport({ ...draft, incidentAt: new Date(now.getTime() + 120_000).toISOString() }, now.getTime()).incidentAt);
  assert.ok(validateResidentReport({ ...draft, incidentAt: 'invalid' }).incidentAt);
});

test('resident validation rejects unsupported categories, overlong details and incomplete references', () => {
  const draft = { location: 'x'.repeat(161), category: 'Invalid', incidentAt: localDateTime(), description: 'x'.repeat(1501), consent: true };
  assert.deepEqual(Object.keys(validateResidentReport(draft)), ['location', 'category', 'description']);
  assert.ok(referencePattern.test('SAN-2026-' + 'A1'.repeat(12)));
  assert.ok(referencePattern.test('SAN-2026-' + 'B2'.repeat(6)));
  assert.equal(referencePattern.test('SAN-2026-123'), false);
});
