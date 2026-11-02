const categories = ['Amplified music', 'Construction', 'Vehicle noise', 'Gathering', 'Other'];
const statuses = ['Submitted', 'Under review', 'In progress', 'Resolved'];
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const publicStatus = ({ id, status, createdAt, updates }) => ({ id, status, createdAt, updates });
export function validateReport(value) {
  if (!value || typeof value !== 'object') fail(400, 'Enter your report details.');
  const location = typeof value.location === 'string' ? value.location.trim() : '';
  const description = typeof value.description === 'string' ? value.description.trim() : '';
  const time = typeof value.incidentAt === 'string' ? Date.parse(value.incidentAt) : NaN;
  if (!location || location.length > 160) fail(400, 'Enter a location of up to 160 characters.');
  if (description.length < 10 || description.length > 1500) fail(400, 'Describe the concern in 10–1,500 characters.');
  if (!categories.includes(value.category)) fail(400, 'Choose a valid noise category.');
  if (!Number.isFinite(time) || time > Date.now() + 60000) fail(400, 'Enter a valid incident time that is not in the future.');
  return { location, description, category: value.category, incidentAt: new Date(time).toISOString() };
}
async function digest(text) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), n => n.toString(16).padStart(2, '0')).join('');
}
export function createHandler({ url, key, origins = [], fetcher = fetch }) {
  async function upstream(path, body, bearer = key) {
    const response = await fetcher(url + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { apikey: key, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(10000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      if (path.startsWith('/auth/')) fail(response.status === 429 ? 429 : 401, response.status === 429 ? 'Too many sign-in attempts. Try again later.' : 'Sign-in failed. Check your email and password.');
      fail(503, 'The report service could not complete this request. Please try again.');
    }
    return data;
  }
  const rpc = (action, payload = {}) => upstream('/rest/v1/rpc/sanaris_service', { action, payload });
  async function authorize(token) {
    if (!token) fail(401, 'Please sign in again.');
    const user = await upstream('/auth/v1/user', undefined, token);
    const allowed = await rpc('authorize', { userId: user.id, hash: await digest(token) });
    if (!allowed) fail(403, 'This account does not have administrator access.');
  }
  return async request => {
    const origin = request.headers.get('origin');
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' };
    const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    try {
      if (origin && !origins.includes(origin)) fail(403, 'This website is not allowed to use the report service.');
      if (origin) Object.assign(headers, { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'content-type,authorization,idempotency-key,x-sanaris-auth', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS' });
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
      if (!url || !key) fail(503, 'The cloud service has not been configured.');
      const path = new URL(request.url).pathname.replace(/^.*\/sanaris-api(?=\/)/, '');
      const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
      const method = request.method;
      async function body() {
        if (!request.headers.get('content-type')?.startsWith('application/json')) fail(415, 'Send JSON data.');
        const reader = request.body?.getReader();
        if (!reader) fail(400, 'Enter request details.');
        let bytes = 0; const chunks = [];
        while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 16000) { await reader.cancel(); fail(413, 'The request is too large.'); } chunks.push(value); }
        const data = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
        try { return JSON.parse(new TextDecoder().decode(data)); } catch { fail(400, 'Send valid JSON.'); }
      }
      if (path === '/api/health' && method === 'GET') { await rpc('health'); return reply({ service: 'sanaris', status: 'ok' }); }
      if (path === '/api/admin/session' && method === 'GET') {
        if (token) await authorize(token);
        return reply({ authenticated: Boolean(token), setupRequired: false, authMode: 'email' });
      }
      if (path === '/api/admin/login' && method === 'POST') {
        const data = await body();
        if (typeof data.email !== 'string' || data.email.length > 254 || typeof data.password !== 'string' || !data.password || data.password.length > 128) fail(400, 'Enter your email and password.');
        if (!await rpc('rate', { bucket: 'login', maximum: 30 })) fail(429, 'Too many sign-in attempts. Wait a minute.');
        const session = await upstream('/auth/v1/token?grant_type=password', { email: data.email.trim(), password: data.password });
        await authorize(session.access_token);
        return reply({ authenticated: true, authMode: 'email', token: session.access_token });
      }
      if (path.startsWith('/api/admin/')) {
        await authorize(token);
        if (path === '/api/admin/logout' && method === 'POST') {
          await rpc('revoke', { hash: await digest(token) });
          return reply({ authenticated: false });
        }
        if (path === '/api/admin/complaints' && method === 'GET') return reply(await rpc('list'));
        const match = path.match(/^\/api\/admin\/complaints\/(SAN-\d{4}-[A-F0-9]{12,32})$/);
        if (match && method === 'PATCH') {
          const data = await body(); if (!statuses.includes(data?.status)) fail(400, 'Choose a valid complaint status.');
          const item = await rpc('update', { id: match[1], status: data.status });
          if (!item) fail(404, 'Report not found.'); return reply(item);
        }
      }
      if (path === '/api/complaints' && method === 'POST') {
        const report = validateReport(await body()), requestKey = request.headers.get('idempotency-key');
        if (!/^[a-zA-Z0-9-]{16,80}$/.test(requestKey || '')) fail(400, 'The submission identifier is invalid. Refresh and try again.');
        if (!await rpc('rate', { bucket: 'submit', maximum: 60 })) fail(429, 'The report service is busy. Please wait a minute.');
        const result = await rpc('submit', { report, requestKey });
        if (result.conflict) fail(409, 'This submission identifier was already used for a different report.');
        return reply(publicStatus(result.item), result.created ? 201 : 200);
      }
      const tracking = path.match(/^\/api\/complaints\/(SAN-\d{4}-[A-F0-9]{12,32})$/);
      if (tracking && method === 'GET') {
        if (!await rpc('rate', { bucket: 'track', maximum: 600 })) fail(429, 'Please wait a minute before checking again.');
        const item = await rpc('find', { id: tracking[1] });
        if (!item) fail(404, 'Report not found. Check your reference number.'); return reply(publicStatus(item));
      }
      fail(404, 'Not found.');
    } catch (error) {
      return reply({ error: error instanceof HttpError ? error.message : 'The report service is temporarily unavailable. Please try again.' }, error instanceof HttpError ? error.status : 503);
    }
  };
}
