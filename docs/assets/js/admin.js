import { dashboardHeader, localClock, metric, overviewAnalytics, overviewPlots, reportMetric, residentPanel } from './overview.js?v=overview-2';
let overviewPeriod = 'Today';
import { requestApi, watchResource, setToken, config } from './api.js?v=signal-1';
import { defaults, migrateSettings, validateSettings, classify, nodes } from './model.js?v=two-stations-1';
import { parseReadings, mergeReadings, stationReadings } from './telemetry.js?v=two-stations-1';
import { escapeHTML as e, icon, brand, heading, panel, badge, empty, notice, field, downloadText, dateTime } from './ui.js?v=signal-1';
import { trendChart, classificationChart } from './charts.js?v=overview-2';
import { createMonitoringMap } from './monitoringMap.js?v=two-stations-1';
import { parseStationDetails, mergeStationDetails, detailIsRecent, stationDetailPanel } from './stationDetails.js?v=station-detail-1';

const root = document.getElementById('app');
const routes = [['overview', 'Overview', 'grid'], ['map', 'Monitoring map', 'pin'], ['events', 'Event history', 'clock'], ['alerts', 'Disturbance alerts', 'bell'], ['analytics', 'Noise analytics', 'chart'], ['complaints', 'Resident complaints', 'message'], ['settings', 'Assessment settings', 'settings']];
function saved(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
const state = { settings: migrateSettings(saved('sanaris-settings', defaults)), session: null, sessionError: '', samples: [], unavailable: false, complaints: [], loading: true, error: '', selected: 'ESP-02', range: 60, nodeFilter: 'All', levelFilter: 'All', search: '', statusFilter: 'All', acknowledged: new Set(), pending: null };
state.stationDetails = [];
state.detailsOpen = false;
let map, reports, sensorTimer, sensorAbort, sensorVersion = 0;
const page = () => location.hash.split('/')[2] || 'overview';
const readings = () => stationReadings(state.samples, Date.now(), state.unavailable);
function feedStatus() {
  if (state.unavailable) return 'Sensor feed unavailable';
  if (readings().some(node => node.status === 'Recent')) return 'Recent station measurements';
  if (state.stationDetails.some(detail => detailIsRecent(detail, Date.now()))) return 'Recent device telemetry';
  return state.samples.length || state.stationDetails.length ? 'Awaiting fresh sensor data' : 'Awaiting sensor data';
}
function put(id, html) { const target = document.getElementById(id); if (target) target.innerHTML = html; }
function passwordField(id, label, setup) {
  return field({ id, label, hint: setup && id === 'password' ? 'Use at least 12 characters. Keep this password for future sign-ins.' : '', control: `<div class="password-control">${icon('lock', 18)}<input id="${id}" name="${id}" type="password" required minlength="${setup ? 12 : 1}" maxlength="128" autocomplete="${setup ? 'new-password' : 'current-password'}" placeholder="${setup ? 'Choose a password' : 'Enter password'}"><button type="button" class="password-toggle" data-password="${id}" aria-label="Show ${label.toLowerCase()}" aria-pressed="false">${icon('eye')}</button></div>` });
}
function login() {
  map?.destroy(); map = null;
  const setup = Boolean(state.session?.setupRequired);
  document.title = 'Admin sign-in · SANARIS';
  const emailField = state.session?.authMode === 'email' ? field({
    id: 'email', label: 'Admin Email',
    control: '<input id="email" name="email" type="email" autocomplete="username" required maxlength="254" placeholder="you@example.com">',
  }) : '';
  root.innerHTML = `<main class="access-page">
    <section class="access-hero" aria-labelledby="welcome-title">
      <div class="access-hero-art" aria-hidden="true">
        <span class="access-wave access-wave-left">${icon('sound', 96)}</span>
        <span class="access-wave access-wave-right">${icon('sound', 72)}</span>
        <span class="access-houses"><i></i><i></i><i></i></span>
      </div>
      ${brand().replace('class="brand"', 'class="brand" aria-label="SANARIS home"')}
      <h1 id="welcome-title">Welcome to SANARIS</h1>
      <p>Smart Noise Monitoring for a Quieter Community</p>
    </section>
    <div class="access-content">
      <section class="access-form-panel" aria-labelledby="access-title">
        <h2 id="access-title">${setup ? 'Set Up Administrator Access' : 'Administrator Login'}</h2>
        <p class="access-description">${setup ? 'Create your password to access the community noise monitoring dashboard.' : 'Secure access to your community noise monitoring dashboard.'}</p>
        <form id="login-form">
          ${emailField}
          ${passwordField('password', 'Password', setup)}
          ${setup ? passwordField('confirm', 'Confirm Password', true) : ''}
          <div id="login-message" aria-live="polite">${state.sessionError ? notice(state.sessionError) : ''}</div>
          <button type="submit" class="primary access-submit" ${!state.session ? 'disabled' : ''}>
            ${setup ? 'Create Admin Password' : 'Sign In to Dashboard'}${icon('arrow', 18)}
          </button>
        </form>
        ${state.sessionError ? '<button type="button" class="secondary access-retry" data-action="retry-session">Try connection again</button>' : ''}
        <p class="access-security">${icon('lock', 14)}Authorized Barangay Officials Only</p>
      </section>
    </div>
    <footer class="access-footer">
      <p>Sound Assessment and Nighttime Acoustic Recording Intelligent System</p>
      <span>${icon('pin', 14)}Barangay San Pablo, Catbalogan City</span>
    </footer>
  </main>`;
}
function endSession(message = '') {
  reports?.stop(); reports = null;
  clearTimeout(sensorTimer); sensorAbort?.abort(); sensorVersion++;
  setToken(''); state.session = { ...state.session, authenticated: false }; state.sessionError = message;
  state.complaints = []; state.samples = []; state.loading = true; state.error = '';
  state.stationDetails = []; state.detailsOpen = false;
  state.acknowledged.clear();
  login();
}
async function checkSession() {
  try { state.session = await requestApi('/api/admin/session'); state.sessionError = ''; }
  catch (error) { state.session = null; state.sessionError = error.message; }
  if (state.session?.authenticated) openWorkspace(); else login();
}
function summary() { return `<div class="assessment-summary"><div><strong>Noise classification</strong><p>Low: below ${state.settings.moderate} · Moderate: ${state.settings.moderate} to below ${state.settings.high} · High: ${state.settings.high}+ dB(A).</p></div><div><strong>Nighttime assessment: not available</strong><p>Requires eight hours of calibrated measurements.</p></div><a href="#/admin/settings">View guidance & settings →</a></div>`; }
function guidance() { return panel('Nighttime noise guidance', 'Health guidance and local legal limits are separate assessments.', `<div class="guideline-grid"><article><span class="eyebrow">OUTSIDE BEDROOMS</span><h2>45 <small>dBA</small></h2><p>WHO 1999 · LAeq,8h</p><p class="muted small">An eight-hour energy average outside bedrooms, with windows open.</p></article><article><span class="eyebrow">INSIDE BEDROOMS</span><h2>30 <small>dBA</small></h2><p>WHO 1999 · LAeq,8h</p><p class="muted small">An outdoor node cannot assess bedroom exposure.</p></article></div><p class="note">These are average-exposure guidelines, not instantaneous maximums or universal legal limits. Your high alert threshold flags individual readings for review.</p><div class="assessment-details"><p><b>WHO assessment: not evaluated.</b> A calibrated eight-hour measurement record is needed.</p><p><b>Catbalogan City ordinance: unverified.</b> Alerts request human review and do not establish a violation.</p></div><div class="guideline-links"><a href="https://iris.who.int/bitstream/handle/10665/326582/9789289013567-eng.pdf?isAllowed=y&sequence=4" target="_blank" rel="noreferrer">WHO community noise guidance ↗</a></div>`); }
function stationCards() { return readings().map(node => {
  const has = Number.isFinite(node.db), level = node.status === 'Recent' ? classify(node.db, state.settings) : has ? 'Last reading' : 'Waiting';
  const details = state.stationDetails.find(item => item.nodeId === node.id);
  const online = node.status === 'Recent' || detailIsRecent(details, Date.now(), state.unavailable);
  const status = online ? 'Online' : has || details ? 'Last received' : 'Planned';
  return `<button class="node-card ${state.selected === node.id ? 'selected' : ''}" data-node="${node.id}" aria-pressed="${state.selected === node.id}" aria-controls="station-detail-host" aria-expanded="${state.detailsOpen && state.selected === node.id}"><div class="row between"><span class="node-icon">${icon('sound', 20)}</span>${badge(status)}</div><p class="small muted node-id">${node.id}</p><h3>${node.name}</h3><div class="reading">${has ? `${node.db.toFixed(1)} <span>dB(A)</span>` : '—'}</div><p class="small muted">${has ? e(level + ' · ' + dateTime(node.timestamp)) : details ? 'dBA measurement unavailable' : 'Awaiting sensor data'}</p><div class="row between small muted"><span>${node.area}</span>${icon('arrow', 16)}</div></button>`;
}).join(''); }
function stats() {
  const recent = readings().filter(node => node.status === 'Recent');
  const high = recent.filter(node => classify(node.db, state.settings) === 'High');
  const average = recent.reduce((sum, node) => sum + node.db, 0) / recent.length;
  const reporting = nodes.filter(node => recent.some(item => item.id === node.id) || state.stationDetails.some(detail => detail.nodeId === node.id && detailIsRecent(detail, Date.now(), state.unavailable))).length;
  return '<div class="metric-grid">' +
    metric('Network average', 'sound', recent.length ? average.toFixed(1) + ' <small>dBA</small>' : '—', recent.length ? 'Latest reporting stations' : feedStatus()) +
    metric('Reporting stations', 'pin', reporting, `${nodes.length} planned sites · ${reporting} reporting`) +
    metric('Potential disturbances', 'bell', recent.length ? high.length : '—', 'Review alerts →', '#/admin/alerts') +
    reportMetric(state) + '</div>';
}
function monitoring(isMap) {
  const stations = `<div class="section-label"><h2>Monitoring stations</h2><span class="small muted" id="feed-status">${feedStatus()}</span></div>
    <div class="node-grid" id="station-cards">${stationCards()}</div><div id="station-detail-host" aria-live="polite"></div>`;
  const mapPanel = panel('Barangay San Pablo, Catbalogan City monitoring map', 'Select a station to view its reading', `<div class="map-toolbar"><span class="small muted">${config.googleMapsApiKey ? 'Google Maps with OpenStreetMap fallback' : 'OpenStreetMap'}</span><a id="google-link" target="_blank" rel="noreferrer">Open in Google Maps ${icon('arrow', 14)}</a></div><div id="monitoring-map" class="map ${isMap ? 'large' : ''}" aria-label="Monitoring locations in Barangay San Pablo, Catbalogan City"></div><p class="map-footer">${badge('Waiting')} Low · Moderate · High <span class="muted">Pins 01 and 02 show the two proposed device locations on Camia Street. Final installation points are pending.</span></p>`, badge(nodes.length + ' stations'));
  if (isMap) return heading('Monitoring map', 'Barangay San Pablo, Catbalogan City') + stations + mapPanel + summary();
  return dashboardHeader() + '<div id="live-stats">' + stats() + '</div>' + stations +
    overviewAnalytics(overviewPeriod) + '<div class="analysis-grid">' + mapPanel + '<div id="report-summary">' + residentPanel(state) + '</div></div>' + summary();
}
function options(values, selected, labels = {}) { return values.map(value => `<option value="${e(value)}" ${value === selected ? 'selected' : ''}>${e(labels[value] || value)}</option>`).join(''); }
function eventRows() { return state.samples.filter(item => (state.nodeFilter === 'All' || item.nodeId === state.nodeFilter) && (state.levelFilter === 'All' || classify(item.db, state.settings) === state.levelFilter)).slice().reverse(); }
function renderEvents() { const rows = eventRows(); put('event-rows', rows.length ? `<div class="table-wrap"><table><thead><tr><th>Time</th><th>Monitoring point</th><th>Node</th><th>Sound level</th><th>Classification</th></tr></thead><tbody>${rows.slice(0, 100).map(item => `<tr><td>${e(dateTime(item.timestamp))}</td><td>${nodes.find(node => node.id === item.nodeId).name}</td><td>${item.nodeId}</td><td>${item.db.toFixed(1)} dB(A)</td><td>${badge(classify(item.db, state.settings))}</td></tr>`).join('')}</tbody></table></div><p class="small muted">${rows.length} matching samples. Showing up to 100; CSV includes all matching samples.</p>` : empty(state.samples.length ? 'No samples match these filters.' : feedStatus())); const button = document.querySelector('[data-action="export"]'); if (button) button.disabled = !rows.length; }
function eventsPage() { return heading('Event history', 'Explore measurements received from the monitoring stations.', `<button class="secondary" data-action="export">${icon('download', 16)} Export CSV</button>`) + panel('Monitoring log', 'Rolling session history', `<div class="filters"><select id="node-filter" aria-label="Filter node">${options(['All', ...nodes.map(node => node.id)], state.nodeFilter, { All: 'All nodes', ...Object.fromEntries(nodes.map(node => [node.id, node.name])) })}</select><select id="level-filter" aria-label="Filter level">${options(['All', 'Low', 'Moderate', 'High'], state.levelFilter)}</select></div><div id="event-rows"></div>`); }
function renderAlerts() { const high = readings().filter(node => node.status === 'Recent' && classify(node.db, state.settings) === 'High'); put('alert-list', high.length ? high.map(node => `<article class="alert-row"><span class="alert-icon">${icon('bell', 22)}</span><div><h3>${node.name}</h3><p>${node.db.toFixed(1)} dB(A) · ${node.id} · ${e(dateTime(node.timestamp))}</p><p class="small muted">${state.acknowledged.has(node.id) ? 'Acknowledged for this session.' : 'Review the time and duration of this event.'}</p></div><button class="secondary" data-ack="${node.id}" ${state.acknowledged.has(node.id) ? 'disabled' : ''}>${state.acknowledged.has(node.id) ? 'Acknowledged' : 'Acknowledge'}</button></article>`).join('') : empty(readings().some(node => node.status === 'Recent') ? 'No recent station readings reach the high threshold.' : feedStatus())); }
function renderAnalytics() {
  const samples = state.samples.filter(item => item.timestamp >= Date.now() - state.range * 60000), message = state.samples.length ? 'No readings in this period.' : feedStatus();
  put('analytics-trend', trendChart(samples.filter(item => item.nodeId === state.selected), state.settings, message)); put('analytics-classification', classificationChart(samples, state.settings, message));
  put('node-comparison', samples.length ? `<div class="comparison-grid">${nodes.map(node => { const values = samples.filter(item => item.nodeId === node.id).map(item => item.db); return `<div><p class="muted">${node.name}</p>${values.length ? `<h2>${(values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1)} <small>dB(A)</small></h2><p class="small muted">Peak ${Math.max(...values).toFixed(1)} dB(A)</p>` : '<p class="small muted">No readings in this period.</p>'}</div>`; }).join('')}</div>` : empty(message));
}
function analyticsPage() { return heading('Noise analytics', 'Explore sound levels measured across the community.', `<select id="analytics-range" aria-label="Analytics time range">${options([60, 15, 5], state.range, { 60: 'Last 60 minutes', 15: 'Last 15 minutes', 5: 'Last 5 minutes' })}</select>`) + `<div class="two-col">${panel('Noise trend', 'Measured samples, not an acoustic exposure average.', '<div id="analytics-trend"></div>', `<select id="analytics-node" aria-label="Analytics node">${options(nodes.map(node => node.id), state.selected, Object.fromEntries(nodes.map(node => [node.id, node.name])))}</select>`)}${panel('Noise classification', 'Measured samples across all stations', '<div id="analytics-classification"></div>')}</div>${summary()}${panel('Node comparison', 'Arithmetic mean and highest reading per station', '<div id="node-comparison"></div>')}`; }
function legacy() { if (state.session?.authMode === 'email') return []; const items = saved('sanaris-complaints', []); return Array.isArray(items) ? items.filter(item => item && !['SAN-DEMO-0001','SAN-2026-A1B2C3D4E5F6','SAN-2026-F6E5D4C3B2A1','SAN-2026-C3D4E5F6A1B2'].includes(item.id) && !state.complaints.some(record => record.id === item.id)) : []; }
function renderInbox() {
  const filtered = state.complaints.filter(item => (state.statusFilter === 'All' || item.status === state.statusFilter) && `${item.id} ${item.location} ${item.category}`.toLowerCase().includes(state.search.toLowerCase()));
  put('complaint-error', state.error ? notice(state.error) : '');
  put('complaint-list', filtered.map(item => `<article class="complaint"><div class="row between wrap"><div><span class="eyebrow">${e(item.id)}</span><h3>${e(item.category)}</h3><p class="small muted">${e(item.location)} · Received ${e(dateTime(item.createdAt))}</p><p class="small muted">Incident time · ${e(dateTime(item.incidentAt))}</p></div>${badge(item.status)}</div><p class="complaint-description">${e(item.description)}</p><label class="status-control">Update status <select data-report-status="${e(item.id)}" aria-label="Status for ${e(item.id)}" ${state.pending ? 'disabled' : ''}>${options(['Submitted', 'Under review', 'In progress', 'Resolved'], item.status)}</select>${state.pending === item.id ? 'Saving…' : ''}</label></article>`).join('') || empty(state.loading ? 'Loading reports…' : state.complaints.length ? 'No complaints match your filters.' : 'No resident reports have been submitted yet.'));
  put('legacy-reports', legacy().length ? panel('Reports saved in this browser', `${legacy().length} reports can be imported into the shared inbox.`, '<button class="secondary" data-action="import-reports">Import saved reports</button>') : '');
}
function complaintsPage() { return heading('Resident complaints', 'Reports submitted through the separate resident reporting site.') + '<div id="legacy-reports"></div>' + panel('Complaint inbox', 'New reports and status changes are checked automatically.', `<div class="filters"><input id="complaint-search" aria-label="Search complaints" placeholder="Search reference or location…" value="${e(state.search)}"><select id="complaint-filter" aria-label="Filter complaint status">${options(['All', 'Submitted', 'Under review', 'In progress', 'Resolved'], state.statusFilter)}</select></div><div id="complaint-error"></div><div id="complaint-message" aria-live="polite"></div><div id="complaint-list"></div>`, '<button class="secondary" data-action="refresh-reports">Refresh</button>'); }
function settingsPage() { return heading('Assessment settings', 'Configure how station readings are assessed.') + panel('Sensor connection', feedStatus(), `<p class="muted">${config.sensorFeedPath ? 'Readings come from the configured gateway feed.' : 'A gateway feed has not been configured for this installation.'}</p>`) + panel('Google Maps', config.googleMapsApiKey ? 'A browser key is configured.' : 'OpenStreetMap is currently available.', `<div class="map-setup"><p>To use Google Maps, enable Maps JavaScript API and billing in Google Cloud. Add a website-restricted browser key to <code>googleMapsApiKey</code> in <code>docs/config.js</code>. Include your local and published website addresses in its restrictions.</p><a href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank" rel="noreferrer">Google Maps setup guide ↗</a></div>`) + guidance() + panel('Alert thresholds', 'These cutoffs flag individual readings for review.', `<form id="settings-form" class="settings-form"><label for="moderate">Moderate threshold · dB(A)<input id="moderate" name="moderate" type="number" min="30" max="119" required value="${state.settings.moderate}"></label><label for="high">High threshold · dB(A)<input id="high" name="high" type="number" min="31" max="120" required value="${state.settings.high}"></label><label for="interval">Sensor feed refresh interval<select id="interval" name="interval">${options([2, 5, 10], state.settings.interval, { 2: 'Every 2 seconds', 5: 'Every 5 seconds', 10: 'Every 10 seconds' })}</select></label><p class="note">Readings at or above the high threshold trigger a disturbance alert.</p><button class="primary">Save settings</button><div id="settings-message" aria-live="polite"></div></form>`); }
function renderPage() {
  if (!state.session?.authenticated) return;
  map?.destroy(); map = null;
  const active = page(), valid = routes.find(route => route[0] === active);
  document.title = `${valid?.[1] || 'Page not found'} · SANARIS`;
  root.innerHTML = `<div class="admin-shell"><aside id="admin-navigation" class="sidebar" aria-label="Admin navigation">${brand()}<div class="workspace-label">BARANGAY WORKSPACE</div><nav>${routes.map(([id, label, symbol]) => `<a href="#/admin/${id}" class="${id === active ? 'active' : ''}" ${id === active ? 'aria-current="page"' : ''}>${icon(symbol)}${label}${id === 'complaints' ? '<span id="report-count" class="nav-count" hidden></span>' : ''}</a>`).join('')}</nav><div class="sidebar-bottom"><div class="profile"><span>BA</span><div>Barangay Admin<small>Report management</small></div></div><button class="sign-out" data-action="logout">${icon('logout', 16)}Sign out</button><div id="logout-error"></div></div></aside><div class="main-shell"><main><div class="admin-mobile-controls"><button class="secondary" data-action="menu" aria-label="Open navigation" aria-expanded="false" aria-controls="admin-navigation">${icon('menu')} Menu</button></div><div id="admin-page">${!valid ? heading('Page not found', 'Choose a page from the navigation.') : active === 'overview' || active === 'map' ? monitoring(active === 'map') : active === 'events' ? eventsPage() : active === 'analytics' ? analyticsPage() : active === 'settings' ? settingsPage() : active === 'complaints' ? complaintsPage() : heading('Potential disturbances', 'Review recent measurements that reached the high threshold.') + panel('Current alerts', `High threshold · ${state.settings.high} dB(A)`, '<div id="alert-list"></div>') + guidance()}</div></main><footer>SANARIS <span>Community Noise Monitoring System</span><span>Barangay San Pablo, Catbalogan City</span></footer></div></div>`;
  const mapElement = document.getElementById('monitoring-map');
  if (mapElement) map = createMonitoringMap(mapElement, { readings: readings(), settings: state.settings, selected: state.selected }, selectNode);
  refreshLive(); updateReportCount(); if (active === 'complaints') renderInbox();
}
function updateReportCount() { const count = state.complaints.filter(item => item.status === 'Submitted').length, element = document.getElementById('report-count'); if (element) { element.textContent = count; element.hidden = !count; element.setAttribute('aria-label', `${count} new reports`); } if (page() === 'overview') { put('report-summary', residentPanel(state)); put('live-stats', stats()); } }
function selectNode(id) {
  if (!nodes.some(node => node.id === id)) return;
  const restoreFocus = document.activeElement?.matches('[data-node]');
  state.selected = id; state.detailsOpen = true; refreshLive();
  if (restoreFocus) root.querySelector(`[data-node="${id}"]`)?.focus({ preventScroll: true });
  document.getElementById('station-detail-host')?.scrollIntoView({
    block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}
function refreshLive() {
  if (!state.session?.authenticated) return;
  if (['overview', 'map'].includes(page())) {
    put('live-stats', stats()); put('station-cards', stationCards()); put('feed-status', e(feedStatus()));
    put('station-detail-host', state.detailsOpen ? stationDetailPanel(state.selected, state.stationDetails, Date.now(), state.unavailable) : '');
    const node = nodes.find(item => item.id === state.selected);
    const link = document.getElementById('google-link'); if (link) {
      const target = Number.isFinite(node.lat) && Number.isFinite(node.lng) ? `${node.lat},${node.lng}` : "Camia Street, Barangay San Pablo, Catbalogan City, Samar, Philippines";
      link.href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(target);
    }
    if (page() === 'overview') {
      const plots = overviewPlots(state, overviewPeriod, feedStatus());
      put('overview-trend', plots.trend); put('overview-class', plots.distribution);
    }
    map?.update({ readings: readings(), settings: state.settings, selected: state.selected });
  } else if (page() === 'events') renderEvents(); else if (page() === 'alerts') renderAlerts(); else if (page() === 'analytics') renderAnalytics();
}
function startSensors() {
  clearTimeout(sensorTimer); sensorAbort?.abort(); const version = ++sensorVersion;
  if (!config.sensorFeedPath) return;
  async function poll() {
    sensorAbort = new AbortController();
    try {
      const payload = await requestApi(config.sensorFeedPath, { signal: sensorAbort.signal });
      if (version !== sensorVersion) return;
      const now = Date.now();
      const samples = parseReadings(payload, now);
      const details = parseStationDetails(payload, now);
      state.samples = mergeReadings(state.samples, samples);
      state.stationDetails = mergeStationDetails(state.stationDetails, details);
      state.unavailable = false;
    }
    catch { if (version !== sensorVersion) return; state.unavailable = true; }
    if (version === sensorVersion) { refreshLive(); sensorTimer = setTimeout(poll, state.settings.interval * 1000); }
  }
  poll();
}
function openWorkspace() {
  reports?.stop(); renderPage(); startSensors();
  reports = watchResource('/api/admin/complaints', items => { const changed = JSON.stringify(items) !== JSON.stringify(state.complaints) || state.loading || state.error; state.complaints = items; state.loading = false; state.error = ''; if (changed) { updateReportCount(); if (page() === 'complaints') renderInbox(); } }, error => { state.loading = false; state.error = error.message; if (error.status === 401 || error.status === 403) { endSession('Your session has ended. Please sign in again.'); } else { updateReportCount(); if (page() === 'complaints') renderInbox(); } });
}
root.addEventListener('submit', async event => {
  event.preventDefault(); const form = event.target;
  if (form.id === 'login-form') {
    const button = form.querySelector('[type="submit"], .access-submit'); if (button.disabled) return;
    const data = new FormData(form), setup = state.session?.setupRequired;
    if (setup && data.get('password') !== data.get('confirm')) { put('login-message', notice('The passwords do not match.')); return; }
    button.disabled = true; button.textContent = 'Please wait…'; put('login-message', '');
    try { const result = await requestApi(setup ? '/api/admin/setup' : '/api/admin/login', { method: 'POST', body: { email: data.get('email'), password: data.get('password') } }); setToken(result.token); state.session = { ...state.session, authenticated: true }; openWorkspace(); }
    catch (error) { put('login-message', notice(error.message)); button.disabled = false; button.textContent = setup ? 'Create Admin Password' : 'Sign In to Dashboard'; }
  } else if (form.id === 'settings-form') {
    const data = new FormData(form), next = { moderate: Number(data.get('moderate')), high: Number(data.get('high')), interval: Number(data.get('interval')), version: defaults.version };
    if (!validateSettings(next)) { put('settings-message', notice('Use thresholds from 30–120 dB(A), with high above moderate.')); return; }
    state.settings = next; startSensors();
    try { localStorage.setItem('sanaris-settings', JSON.stringify(next)); put('settings-message', notice('Assessment settings saved.', true)); }
    catch { put('settings-message', notice('Applied for this session. Browser storage is unavailable.')); }
  }
});
root.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.dataset.password) { const input = document.getElementById(button.dataset.password), visible = input.type === 'password'; input.type = visible ? 'text' : 'password'; button.setAttribute('aria-pressed', String(visible)); button.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} ${button.dataset.password === 'confirm' ? 'confirm password' : 'password'}`); return; }
  if (button.dataset.period) {
    overviewPeriod = button.dataset.period;
    for (const option of root.querySelectorAll('[data-period]')) option.setAttribute('aria-pressed', String(option === button));
    refreshLive(); return;
  }
  if (button.dataset.node) { selectNode(button.dataset.node); return; }
  if (button.dataset.ack) { state.acknowledged.add(button.dataset.ack); renderAlerts(); return; }
  const action = button.dataset.action;
  if (action === 'menu') { const open = document.getElementById('admin-navigation').classList.toggle('open'); button.setAttribute('aria-expanded', String(open)); button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation'); }
  if (action === 'retry-session') checkSession();
  if (action === 'refresh-reports') reports?.refresh();
  if (action === 'logout') {
    try { await requestApi('/api/admin/logout', { method: 'POST' }); endSession(); }
    catch (error) { put('logout-error', notice(error.message)); }
  }
  if (action === 'export') { const lines = eventRows().map(item => [new Date(item.timestamp).toISOString(), item.nodeId, nodes.find(node => node.id === item.nodeId).name, item.db, classify(item.db, state.settings)].join(',')); downloadText(['Timestamp,Node,Location,Level dBA,Classification', ...lines].join('\n'), 'sanaris-readings.csv', 'text/csv;charset=utf-8'); }
  if (action === 'import-reports') { button.disabled = true; try { const items = legacy(); for (let index = 0; index < items.length; index += 100) await requestApi('/api/admin/complaints/import', { method: 'POST', body: { reports: items.slice(index, index + 100) } }); reports?.refresh(); put('complaint-message', notice('Saved reports imported into the shared inbox.', true)); } catch (error) { put('complaint-error', notice(error.message)); button.disabled = false; } }
});
root.addEventListener('input', event => { if (event.target.id === 'complaint-search') { state.search = event.target.value; renderInbox(); } });
root.addEventListener('change', async event => {
  const input = event.target;
  if (input.id === 'node-filter') { state.nodeFilter = input.value; renderEvents(); }
  if (input.id === 'level-filter') { state.levelFilter = input.value; renderEvents(); }
  if (input.id === 'analytics-range') { state.range = Number(input.value); renderAnalytics(); }
  if (input.id === 'analytics-node') { state.selected = input.value; renderAnalytics(); }
  if (input.id === 'complaint-filter') { state.statusFilter = input.value; renderInbox(); }
  if (input.dataset.reportStatus) {
    state.pending = input.dataset.reportStatus; input.disabled = true;
    try { const item = await requestApi('/api/admin/complaints/' + state.pending, { method: 'PATCH', body: { status: input.value } }); state.complaints = state.complaints.map(record => record.id === item.id ? item : record); put('complaint-message', notice('Status updated. The resident can see the change in their tracker.', true)); state.error = ''; }
    catch (error) { state.error = error.message; }
    finally { state.pending = null; renderInbox(); updateReportCount(); }
  }
});
window.addEventListener('hashchange', () => { renderPage(); window.scrollTo(0, 0); });
window.addEventListener('pagehide', () => { reports?.stop(); sensorVersion++; clearTimeout(sensorTimer); sensorAbort?.abort(); map?.destroy(); });
setInterval(() => { put('dashboard-time', localClock()); if (state.samples.length || state.stationDetails.length) refreshLive(); }, 10000);
login(); checkSession();
