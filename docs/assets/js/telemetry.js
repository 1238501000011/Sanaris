import { nodes } from './model.js?v=camia-clover-1';

const stationIds = new Set(nodes.map(node => node.id));
const historyLimit = 120;
const recentWindow = 60_000;

// This endpoint is supplied by the gateway backend. A repeated poll may
// contain the same measurement, and different stations can report separately.
export function parseReadings(payload, now) {
  if (!Array.isArray(payload)) throw new TypeError('Expected an array of sensor readings.');
  const readings = [];
  for (const item of payload) {
    if (item?.source !== 'hardware' || !stationIds.has(item.nodeId)) continue;
    if (!Number.isFinite(item.laeqDbA) || typeof item.measuredAt !== 'string') continue;
    const timestamp = Date.parse(item.measuredAt);
    if (!Number.isFinite(timestamp) || timestamp > now) continue;
    readings.push({ nodeId: item.nodeId, db: item.laeqDbA, timestamp });
  }
  return readings;
}

export function mergeReadings(previous, incoming) {
  const byStation = new Map(nodes.map(node => [node.id, new Map()]));
  for (const reading of [...previous, ...incoming]) {
    byStation.get(reading.nodeId).set(reading.timestamp, reading);
  }
  const chronological = (a, b) => a.timestamp - b.timestamp;
  return [...byStation.values()]
    .flatMap(bucket => [...bucket.values()].sort(chronological).slice(-historyLimit))
    .sort(chronological);
}

export function stationReadings(samples, now, feedUnavailable = false) {
  const latest = new Map(samples.map(sample => [sample.nodeId, sample]));
  return nodes.map(node => {
    const sample = latest.get(node.id);
    if (!sample) return { ...node, db: null, timestamp: null, status: 'Awaiting sensor data' };
    const recent = !feedUnavailable && now - sample.timestamp <= recentWindow;
    return { ...node, db: sample.db, timestamp: sample.timestamp, status: recent ? 'Recent' : 'Last reading' };
  });
}
