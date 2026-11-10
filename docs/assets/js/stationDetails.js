import { nodes } from './model.js?v=two-stations-1';
import { escapeHTML as e, icon } from './ui.js?v=signal-1';

const stationIds = new Set(nodes.map(node => node.id));
const philippineTime = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
});

function timestamp(value, latest = Infinity) {
  if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed <= latest ? parsed : null;
}
function text(value, limit) {
  return typeof value === 'string' && value.trim() && value.trim().length <= limit ? value.trim() : null;
}
const boolean = value => typeof value === 'boolean' ? value : null;
const time = value => value == null ? 'Unknown' : philippineTime.format(new Date(value)) + ' (PH)';

// Optional metadata shares the gateway packet, but never enters dBA history.
export function parseStationDetails(payload, now) {
  if (!Array.isArray(payload)) throw new TypeError('Expected an array of station telemetry.');
  const details = [];
  for (const item of payload) {
    if (item?.source !== 'hardware' || !stationIds.has(item.nodeId)) continue;
    const measuredAt = timestamp(item.measuredAt, now);
    if (measuredAt === null) continue;
    const receivedAt = timestamp(item.receivedAt, now);
    details.push({
      nodeId: item.nodeId, timestamp: receivedAt ?? measuredAt, measuredAt, receivedAt,
      detectedSound: text(item.detectedSound, 80),
      confidence: Number.isFinite(item.confidence) && item.confidence >= 0 && item.confidence <= 1 ? item.confidence : null,
      microphoneDbfs: Number.isFinite(item.microphoneDbfs) && item.microphoneDbfs <= 0 ? item.microphoneDbfs : null,
      inaeDecision: text(item.inaeDecision, 64), quietHours: boolean(item.quietHours),
      deviceTime: timestamp(item.deviceTime), rtcValid: boolean(item.rtcValid), sdOnline: boolean(item.sdOnline),
    });
  }
  return details;
}

export function mergeStationDetails(previous, incoming) {
  const latest = new Map();
  for (const item of [...previous, ...incoming]) {
    if (!stationIds.has(item.nodeId)) continue;
    const existing = latest.get(item.nodeId);
    if (!existing || item.timestamp >= existing.timestamp) latest.set(item.nodeId, item);
  }
  return [...latest.values()];
}

export function detailIsRecent(detail, now, unavailable = false) {
  return Boolean(detail && !unavailable && now >= detail.timestamp && now - detail.timestamp <= 60000);
}

export function stationDetailPanel(nodeId, details, now = Date.now(), unavailable = false) {
  const detail = details.find(item => item.nodeId === nodeId);
  const recent = detailIsRecent(detail, now, unavailable);
  const status = !detail ? 'Awaiting station telemetry' : recent ? 'Recent device telemetry' : 'Last received data · device not reporting recently';
  const confidence = detail?.confidence != null ? (detail.confidence * 100).toFixed(1) + '%' : 'Unknown';
  const mic = detail?.microphoneDbfs != null ? `${detail.microphoneDbfs.toFixed(1)} <small>dBFS</small>` : '—';
  const quiet = detail?.quietHours == null ? 'Unknown' : detail.quietHours ? 'Yes' : 'No';
  const rtc = detail?.rtcValid == null ? 'Unknown' : detail.rtcValid ? 'Valid' : 'Invalid';
  const sd = detail?.sdOnline == null ? 'Unknown' : detail.sdOnline ? 'Online' : 'Offline';
  return `<section class="station-detail panel" aria-labelledby="station-detail-title">
    <div class="station-detail-heading">
      <div><h2 id="station-detail-title">${e(nodeId)} · ${recent ? 'Live ' : ''}TinyML + INAE</h2><p>${status}</p></div>
      <span aria-hidden="true">${icon('sound', 24)}</span>
    </div>
    <dl class="station-detail-grid">
      <div><dt>Detected sound</dt><dd><strong>${e(detail?.detectedSound || 'Awaiting detection')}</strong><span>Confidence ${confidence}</span></dd></div>
      <div><dt>Microphone level</dt><dd><strong>${mic}</strong><span>Uncalibrated digital audio level</span></dd></div>
      <div><dt>INAE decision</dt><dd><strong>${e(detail?.inaeDecision || 'Awaiting decision')}</strong><span>Quiet hours: ${quiet}</span></dd></div>
      <div class="station-device-clock"><dt>Device clock</dt><dd><strong>${time(detail?.deviceTime)}</strong><span>RTC: ${rtc} · microSD: ${sd}</span></dd></div>
    </dl>
    <p class="station-detail-note">${detail ? `${detail.receivedAt == null ? 'Reading time' : 'Last received'}: ${time(detail.receivedAt ?? detail.measuredAt)}. ` : ''}Noise-violation assessment requires calibrated measurements.</p>
  </section>`;
}
