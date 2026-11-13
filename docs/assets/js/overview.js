import { badge, escapeHTML as e, icon, panel, dateTime } from './ui.js?v=signal-1';
import { trendChart } from './charts.js?v=overview-2';

const clockFormat = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit',
});
export const localClock = () => clockFormat.format(new Date());

export function dashboardHeader() {
  return `<header class="page-heading dashboard-header">
    <div><p class="dashboard-subtitle">Community Noise Monitoring</p><h1>SANARIS Dashboard</h1>
    <p class="dashboard-location">${icon('pin', 14)} Barangay San Pablo, Catbalogan City</p></div>
    <div class="dashboard-tools"><time id="dashboard-time" aria-label="Philippine date and time">${localClock()}</time>
    <a class="notification-link" aria-label="Notifications: disturbance alerts" title="Disturbance alerts" href="#/admin/alerts">${icon('bell', 19)}</a>
    <span class="admin-profile"><b aria-hidden="true">BA</b> Barangay Admin</span></div></header>`;
}

function reportCounts(items) {
  const total = items.length, resolved = items.filter(item => item.status === 'Resolved').length;
  return { total, resolved, open: total - resolved, pending: items.filter(item => item.status === 'Submitted').length };
}
function reportMessage(state) {
  if (state.error) return 'Report service unavailable';
  return state.loading ? 'Loading reports…' : '';
}
export function reportMetric(state) {
  const counts = reportCounts(state.complaints), message = reportMessage(state);
  return metric('Resident reports', 'message', message ? '—' : counts.total,
    message || `${counts.pending} new · ${counts.open} open`, '#/admin/complaints');
}
export function metric(title, symbol, value, detail, href = '') {
  const content = `<span class="metric-label">${icon(symbol, 17)} ${title}</span><strong>${value}</strong><small>${detail}</small>`;
  return href ? `<a class="metric" href="${href}">${content}</a>` : `<div class="metric">${content}</div>`;
}
export function residentPanel(state) {
  const counts = reportCounts(state.complaints), message = reportMessage(state);
  const latest = state.complaints.reduce((a,b) => !a || Date.parse(b.createdAt) > Date.parse(a.createdAt) ? b : a, null);
  const body = message ? `<p class="muted">${message}</p>` : `<dl class="report-totals">${['total','pending','open','resolved'].map(key =>
    `<div><dt>${key === 'pending' ? 'New' : key}</dt><dd>${counts[key]}</dd></div>`).join('')}</dl>
    ${latest ? `<div class="latest-report"><small>Latest report</small><strong>${e(latest.category)}</strong><span>${e(latest.location)} · ${e(dateTime(latest.createdAt))}</span>${badge(latest.status)}</div>` : '<p class="muted">No resident reports received.</p>'}`;
  return panel('Resident reports', '', body, '<a class="text-link" href="#/admin/complaints">Review reports →</a>');
}

export function overviewAnalytics(period) {
  const filters = ['Today','This Week','This Month'].map(label =>
    `<button type="button" data-period="${label}" aria-pressed="${period === label}">${label}</button>`).join('');
  return `<div class="analysis-grid">
    ${panel('Noise report and analysis', 'Selected station · available gateway readings', '<div id="overview-trend"></div>', `<div class="period-filter" role="group" aria-label="Analysis period">${filters}</div>`)}
    ${panel('Noise classification', 'TinyML sound categories · selected period', '<div id="overview-class"></div>')}
  </div>`;
}

// Philippine calendar days; weeks start on Monday.
export function periodStart(period, now = Date.now()) {
  const offset = 8 * 3600000;
  const day = new Date(now + offset);
  day.setUTCHours(0, 0, 0, 0);
  if (period === 'This Week') day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  if (period === 'This Month') day.setUTCDate(1);
  return day.getTime() - offset;
}

function microphoneChart(items) {
  const values = items.slice(-100);
  const width = 640, height = 260, left = 55, right = 18, top = 25, bottom = 42;
  const low = Math.floor(Math.min(...values.map(item => item.microphoneDbfs)) / 10) * 10 - 10;
  const high = Math.min(0, Math.ceil(Math.max(...values.map(item => item.microphoneDbfs)) / 10) * 10 + 10);
  const duration = Math.max(1, values.at(-1).measuredAt - values[0].measuredAt);
  const x = item => left + (item.measuredAt - values[0].measuredAt) / duration * (width - left - right);
  const y = value => height - bottom - (value - low) / (high - low) * (height - top - bottom);
  const time = value => new Date(value).toLocaleTimeString('en-PH', {timeZone: 'Asia/Manila'});
  const ticks = [0, .25, .5, .75, 1].map(part => {
    const value = low + part * (high - low);
    return `<line x1="${left}" x2="${width-right}" y1="${y(value)}" y2="${y(value)}" stroke="#e8eef6"/><text x="${left-8}" y="${y(value)+4}" text-anchor="end">${value.toFixed(0)}</text>`;
  }).join('');
  return `<div class="native-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Uncalibrated microphone level in dBFS">
    <text x="4" y="14">dBFS</text>${ticks}
    <polyline points="${values.map(item => x(item)+','+y(item.microphoneDbfs)).join(' ')}" fill="none" stroke="#1268DB" stroke-width="2.5"/>
    ${values.map(item => `<circle cx="${x(item)}" cy="${y(item.microphoneDbfs)}" r="3" fill="#1268DB" tabindex="0" aria-label="${e(time(item.measuredAt))}: ${item.microphoneDbfs.toFixed(1)} dBFS"><title>${e(time(item.measuredAt))} · ${item.microphoneDbfs.toFixed(1)} dBFS</title></circle>`).join('')}
    <text x="${left}" y="${height-20}">${e(time(values[0].measuredAt))}</text>
    <text x="${width-right}" y="${height-20}" text-anchor="end">${e(time(values.at(-1).measuredAt))}</text>
    <text x="320" y="257" text-anchor="middle">Philippine time</text>
    </svg><p class="small muted">Uncalibrated digital audio level. Not dBA; no disturbance thresholds are applied.</p></div>`;
}

function soundCategories(items) {
  const counts = new Map();
  for (const item of items) {
    if (typeof item.detectedSound !== 'string' || !item.detectedSound.trim()) continue;
    const category = item.detectedSound.trim();
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  if (!counts.size) return '<div class="distribution-placeholder"><div class="neutral-ring" aria-hidden="true">—</div><strong>Awaiting TinyML results</strong><p class="small muted">The current test sends microphone levels only. Sound categories are not available yet.</p></div>';
  const palette = ['#1268DB','#6535D5','#20a38a','#e4a238','#e25e68','#7193b9'];
  const total = [...counts.values()].reduce((a,b) => a+b,0);
  let offset = 0;
  const entries = [...counts.entries()].sort((a,b) => b[1]-a[1]);
  const circles = entries.map(([name,count], index) => {
    const size = count/total*100;
    const circle = `<circle cx="75" cy="75" r="55" pathLength="100" fill="none" stroke="${palette[index%palette.length]}" stroke-width="20" stroke-dasharray="${size} ${100-size}" stroke-dashoffset="${-offset}" transform="rotate(-90 75 75)"/>`;
    offset += size;
    return circle;
  }).join('');
  return `<div class="classification-chart"><svg viewBox="0 0 150 150" role="img" aria-label="Received TinyML sound categories">${circles}<text x="75" y="76" text-anchor="middle" class="chart-count">${total}</text><text x="75" y="94" text-anchor="middle">records</text></svg><ul>${entries.map(([name,count]) => `<li><span>${e(name)}</span><strong>${count}</strong><span>${(count/total*100).toFixed(0)}%</span></li>`).join('')}</ul></div><p class="small muted">Classified telemetry records; not counts of unique noise events.</p>`;
}

export function overviewPlots(state, period, status) {
  const start = periodStart(period);
  const samples = state.samples.filter(item => item.timestamp >= start);
  const selected = samples.filter(item => item.nodeId === state.selected);
  const history = (state.telemetryHistory || []).filter(item => item.measuredAt >= start);
  const microphone = history.filter(item => item.nodeId === state.selected && Number.isFinite(item.microphoneDbfs));
  const message = state.unavailable ? status : 'Awaiting microphone readings';
  const trend = selected.length ? trendChart(selected, state.settings) : microphone.length ? microphoneChart(microphone) :
    `<div class="chart-placeholder"><div class="empty-grid"><span>dBFS / dBA</span><b>${e(message)}</b><small>Time</small></div></div>`;
  const note = state.unavailable ? '<p class="small muted">Feed unavailable. Showing previously received records.</p>' : '';
  return {
    trend: note + trend + `<div class="chart-caption">${e(state.selected)}<span>Available fetched history · up to 720 records per request</span></div>`,
    distribution: note + soundCategories(history),
  };
}
