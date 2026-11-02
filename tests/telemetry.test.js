import test from 'node:test';
import assert from 'node:assert/strict';
import { classify } from '../src/lib/model.js';
import { parseReadings, mergeReadings, stationReadings } from '../src/lib/telemetry.js';

const now = Date.parse('2026-11-01T12:00:00Z');
const packet = (nodeId, db, timestamp = now) => ({
  nodeId, laeqDbA: db, measuredAt: new Date(timestamp).toISOString(), source: 'hardware',
});

test('empty feed leaves four unclassified stations awaiting data', () => {
  const stations = stationReadings([], now);
  assert.equal(stations.length, 4);
  assert.ok(stations.every(node => node.db === null && node.timestamp === null && node.status === 'Awaiting sensor data'));
  assert.equal(classify(stations[0].db), null);
});

test('only known hardware measurements with finite levels and valid times enter history', () => {
  const samples = parseReadings([
    packet('ESP-01', 0), { ...packet('ESP-02', 88), source: 'simulated' },
    packet('UNKNOWN', 44), packet('ESP-03', null), packet('ESP-04', '45'),
    { ...packet('ESP-02', 44), measuredAt: 'invalid' }, packet('ESP-02', 46, now + 1), null,
  ], now);
  assert.deepEqual(samples, [{ nodeId: 'ESP-01', db: 0, timestamp: now }]);
  assert.throws(() => parseReadings({}, now));
});

test('partial, delayed and repeated batches retain separate station histories and the 45 dBA boundary', () => {
  const first = parseReadings([packet('ESP-01', 45), packet('ESP-02', 44.9)], now);
  const next = parseReadings([packet('ESP-01', 45), packet('ESP-01', 35, now - 1000)], now);
  const merged = mergeReadings(first, next);
  assert.deepEqual(merged.map(sample => sample.timestamp), [now - 1000, now, now]);
  const stations = stationReadings(merged, now);
  assert.deepEqual(stations.map(node => classify(node.db)), ['High', 'Moderate', null, null]);
  assert.equal(stations.filter(node => node.status === 'Recent').length, 2);
  assert.equal(stationReadings(merged, now + 60_001)[0].status, 'Last reading');
  assert.equal(stationReadings(merged, now, true)[0].status, 'Last reading');
});

test('a busy station cannot evict the last measurement from another station', () => {
  const batch = [packet('ESP-02', 44, now - 10_000)];
  for (let i = 0; i < 145; i++) batch.push(packet('ESP-01', i, now - 145 + i));
  const samples = mergeReadings([], parseReadings(batch, now));
  assert.equal(samples.filter(sample => sample.nodeId === 'ESP-01').length, 120);
  assert.equal(stationReadings(samples, now)[1].db, 44);
});
