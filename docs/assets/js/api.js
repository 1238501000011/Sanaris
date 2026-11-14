import { config } from '../../config.js?v=signal-1';
export { config };
// Keep the current tab's access token across reloads. The server validates it.
function sessionKey() {
  return 'sanaris-admin-session:' + apiUrl('/api/admin/session').href;
}
function restoreToken() {
  try { return sessionStorage.getItem(sessionKey()) || ''; }
  catch { return ''; }
}
let token = restoreToken();
export function setToken(value) {
  token = typeof value === 'string' ? value : '';
  try {
    if (token) sessionStorage.setItem(sessionKey(), token);
    else sessionStorage.removeItem(sessionKey());
  } catch { /* Sign-in still works when browser storage is unavailable. */ }
}
export function apiUrl(path) {
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const configured = config.apiBase?.trim() || (!local ? config.cloudApiBase?.trim() : '');
  const base = configured ? new URL(configured.replace(/\/?$/, '/')) : new URL('/', location.href);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password) throw new Error('The report service address is not configured correctly.');
  if (location.protocol === 'https:' && base.protocol !== 'https:') throw new Error('The report service needs a secure HTTPS address.');
  return new URL(path.replace(/^\//, ''), base);
}
export async function requestApi(path, { method = 'GET', body, key, signal } = {}) {
  const url = apiUrl(path);
  const adminRequest = /\/api\/admin\//.test(url.pathname);
  const authenticatedRequest = adminRequest || (config.sensorFeedPath && path === config.sensorFeedPath);
  const requestToken = token;
  let response;
  try {
    response = await fetch(url, { method, mode: 'cors', credentials: url.origin === location.origin ? 'same-origin' : 'omit', cache: 'no-store', redirect: 'error',
      headers: { Accept: 'application/json', ...(authenticatedRequest && requestToken ? { Authorization: `Bearer ${requestToken}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}), ...(/\/admin\/(login|setup)$/.test(path) ? { 'X-SANARIS-Auth': 'bearer' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
  } catch (error) { if (signal?.aborted) throw error; throw new Error('Cannot reach the report service. Please try again.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) {
    if (adminRequest && [401, 403].includes(response.status) && token === requestToken) setToken('');
    const error = new Error(data?.error || 'The report service is unavailable. Please try again.'); error.status = response.status; throw error;
  }
  if (adminRequest && token === requestToken && (path === '/api/admin/logout' || (path === '/api/admin/session' && data.authenticated === false))) setToken('');
  return data;
}
// Passwords are never persisted. Logout and rejected sessions clear the saved token.
// Polling also works when GitHub Pages and the API are on different domains.
export function watchResource(path, onData, onError) {
  let active = true, busy = false, queued = false, events;
  const controller = new AbortController();
  async function refresh() {
    if (!active) return;
    if (busy) { queued = true; return; }
    busy = true;
    try {
      const data = await requestApi(path, { signal: controller.signal });
      if (active) {
        onData(data);
        if (!events && apiUrl(path).origin === location.origin) {
          events = new EventSource(apiUrl(path + '/events'));
          events.addEventListener('complaints-changed', refresh);
          events.onerror = () => { events?.close(); events = null; };
        }
      }
    } catch (error) { if (active) onError(error); }
    finally { busy = false; if (queued && active) { queued = false; refresh(); } }
  }
  const interval = setInterval(refresh, 5000);
  refresh();
  return { refresh, stop() { active = false; controller.abort(); events?.close(); clearInterval(interval); } };
}
