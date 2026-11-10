import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReadings } from '../docs/assets/js/telemetry.js';
import { parseStationDetails, mergeStationDetails, stationDetailPanel, detailIsRecent } from '../docs/assets/js/stationDetails.js';

const now = Date.parse('2026-11-04T05:08:00Z');
const packet = {
  source: 'hardware', nodeId: 'ESP-01', measuredAt: new Date(now).toISOString(),
  receivedAt: new Date(now).toISOString(), detectedSound: 'vehicle noise', confidence: .996,
  microphoneDbfs: -25.8, inaeDecision: 'MONITORING', quietHours: false,
  deviceTime: new Date(now).toISOString(), rtcValid: true, sdOnline: false,
};

test('digital station telemetry displays independently from dBA history', () => {
  const details = parseStationDetails([packet], now);
  assert.deepEqual(parseReadings([packet], now), []);
  const html = stationDetailPanel('ESP-01', details, now);
  for (const value of ['vehicle noise', '99.6%', '-25.8', 'dBFS', 'MONITORING', 'Quiet hours: No', 'RTC: Valid', 'microSD: Offline', '(PH)']) assert.ok(html.includes(value), value);
  assert.ok(detailIsRecent(details[0], now));
  assert.ok(stationDetailPanel('ESP-01', details, now + 60001).includes('not reporting recently'));
  assert.ok(!detailIsRecent(details[0], now, true));
});

test('station selection and partial updates cannot leak another station or older decision', () => {
  const first = parseStationDetails([packet], now);
  const waiting = stationDetailPanel('ESP-02', first, now);
  assert.ok(waiting.includes('Awaiting station telemetry'));
  assert.ok(!waiting.includes('vehicle noise'));
  const next = parseStationDetails([{ source: 'hardware', nodeId: 'ESP-01', measuredAt: new Date(now + 1000).toISOString(), microphoneDbfs: -10 }], now + 1000);
  const latest = mergeStationDetails(first, next);
  assert.equal(latest[0].inaeDecision, null);
  assert.equal(latest[0].quietHours, null);
  assert.equal(latest[0].confidence, null);
  assert.deepEqual(mergeStationDetails(latest, first), latest);
  assert.ok(stationDetailPanel('ESP-01', latest, now + 1000).includes('Awaiting decision'));
  assert.ok(stationDetailPanel('ESP-01', latest, now + 1000).includes('Reading time:'));
});

test('invalid metadata stays unknown and station text is safely escaped', () => {
  assert.deepEqual(parseStationDetails([
    { ...packet, source: 'simulated' }, { ...packet, nodeId: 'ESP-03' },
    { ...packet, measuredAt: 'invalid' }, { ...packet, measuredAt: new Date(now + 1).toISOString() },
  ], now), []);
  const details = parseStationDetails([{ ...packet, detectedSound: '<img src=x onerror=alert(1)>', inaeDecision: '<script>bad()</script>',
    confidence: 99.6, microphoneDbfs: 20, quietHours: 'false', rtcValid: 'true', sdOnline: 0, deviceTime: 'invalid', receivedAt: 'invalid',
  }], now);
  const html = stationDetailPanel('ESP-01', details, now);
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('Confidence Unknown'));
  assert.ok(html.includes('Quiet hours: Unknown'));
  assert.ok(html.includes('RTC: Unknown'));
  assert.equal(details[0].microphoneDbfs, null);
  assert.equal(details[0].receivedAt, null);
});
