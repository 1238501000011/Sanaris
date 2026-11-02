import { config } from '../../config.js';
export { config };
let token = '';
export function setToken(value) { token = typeof value === 'string' ? value : ''; }
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
  let response;
  try {
    response = await fetch(url, { method, mode: 'cors', credentials: url.origin === location.origin ? 'same-origin' : 'omit', cache: 'no-store', redirect: 'error',
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(key ? { 'Idempotency-Key': key } : {}), ...(/\/admin\/(login|setup)$/.test(path) ? { 'X-SANARIS-Auth': 'bearer' } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
  } catch (error) { if (signal?.aborted) throw error; throw new Error('Cannot reach the report service. Please try again.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok || data === null) { const error = new Error(data?.error || 'The report service is unavailable. Please try again.'); error.status = response.status; throw error; }
  return data;
}
// Bearer credentials stay in memory, never in a URL or browser storage.
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
