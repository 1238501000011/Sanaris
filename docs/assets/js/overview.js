import { badge, escapeHTML as e, icon, panel, dateTime } from './ui.js?v=signal-1';
import { classificationChart, trendChart } from './charts.js?v=overview-2';

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
    ${panel('Noise classification', 'All stations · selected period', '<div id="overview-class"></div>')}
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
export function overviewPlots(state, period, status) {
  const start = periodStart(period);
  const samples = state.samples.filter(item => item.timestamp >= start);
  const selected = samples.filter(item => item.nodeId === state.selected);
  const message = state.unavailable ? status : 'Awaiting sensor data';
  const trend = selected.length ? trendChart(selected, state.settings) :
    `<div class="chart-placeholder"><div class="empty-grid"><span>dBA</span><b>${state.samples.length && !state.unavailable ? 'No station readings in this period' : message}</b><small>Time</small></div></div>`;
  const distribution = samples.length ? classificationChart(samples, state.settings) :
    `<div class="distribution-placeholder"><div class="neutral-ring" aria-hidden="true">—</div><strong>${state.unavailable ? message : 'No detections in this period'}</strong></div>`;
  return { trend: trend + `<div class="chart-caption">${e(state.selected)}<a href="#/admin/analytics">Explore analytics →</a></div>`, distribution };
}
