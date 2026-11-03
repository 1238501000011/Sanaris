import { classify } from './model.js?v=camia-clover-1';

export const mapColors = { Low: '#20a38a', Moderate: '#e4a238', High: '#e25e68' };
export const waitingColor = '#8190a5';

export function stationDisplay(node, settings) {
  const level = node.status === 'Recent' ? classify(node.db, settings) : null;
  const hasReading = Number.isFinite(node.db);
  return {
    color: mapColors[level] ?? waitingColor,
    reading: hasReading ? `${level ?? node.status} · ${node.db.toFixed(1)} dB(A)` : 'Awaiting sensor data',
    time: hasReading && node.timestamp != null ? new Date(node.timestamp).toLocaleString() : '',
  };
}
