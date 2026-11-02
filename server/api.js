import { randomBytes } from 'node:crypto';
import { openComplaintStore, publicStatus, RequestError } from './complaints.js';

const cookieName = 'sanaris_admin';
const sessionLifetime = 8 * 60 * 60 * 1000;

export function createApi({ databasePath, allowedOrigins = [], initialPassword = '' }) {
  const origins = new Set(allowedOrigins.filter(Boolean).map(origin => {
    const url = new URL(origin);
    if (!['https:', 'http:'].includes(url.protocol) || url.origin !== origin) throw new Error('SANARIS_ALLOWED_ORIGINS must contain exact http(s) origins without paths or trailing slashes.');
    return origin;
  }));
  const store = openComplaintStore(databasePath);
  try { if (initialPassword && !store.configured()) store.setPassword(initialPassword); }
  catch (error) { store.close(); throw error; }
  const sessions = new Map();
  const streams = new Set();
  const rateLimits = new Map();
  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const [token, expires] of sessions) if (expires <= now) sessions.delete(token);
    for (const [key, rate] of rateLimits) if (rate.until <= now) rateLimits.delete(key);
    for (const stream of streams) {
      if (stream.token && !sessions.has(stream.token)) { stream.response.end(); streams.delete(stream); }
      else stream.response.write(': keepalive\n\n');
    }
  }, 15000);
  heartbeat.unref();

  function tokenFor(request) {
    const bearer = request.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/i);
    if (bearer) return bearer[1];
    return request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  }
  function authenticated(request) { return (sessions.get(tokenFor(request)) ?? 0) > Date.now(); }
  function json(response, status, data) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(JSON.stringify(data));
  }
  function rateLimit(request, name, max) {
    const key = `${name}:${request.socket.remoteAddress}`;
    const now = Date.now();
    let rate = rateLimits.get(key);
    if (!rate || rate.until < now) { rate = { count: 0, until: now + 60000 }; rateLimits.set(key, rate); }
    if (++rate.count > max) throw new RequestError('Too many attempts. Please wait a minute and try again.', 429);
  }
  async function body(request) {
    if (!request.headers['content-type']?.startsWith('application/json')) throw new RequestError('Send JSON data.', 415);
    let value = '';
    for await (const chunk of request) {
      value += chunk;
      if (Buffer.byteLength(value) > 256000) throw new RequestError('The request is too large.', 413);
    }
    try { return JSON.parse(value); } catch { throw new RequestError('The request is not valid JSON.'); }
  }
  function createSession(request, response) {
    const token = randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + sessionLifetime);
    response.setHeader('Set-Cookie', `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=28800${request.socket.encrypted ? '; Secure' : ''}`);
    return request.headers['x-sanaris-auth'] === 'bearer' ? { authenticated: true, token } : { authenticated: true };
  }
  function openStream(request, response, options) {
    response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    response.write('retry: 3000\nevent: ready\ndata: {}\n\n');
    const stream = { response, ...options };
    streams.add(stream);
    response.on('close', () => streams.delete(stream));
  }
  function publish(id) {
    for (const stream of streams) {
      if (stream.token && (sessions.get(stream.token) ?? 0) <= Date.now()) { stream.response.end(); streams.delete(stream); continue; }
      if (!stream.id || stream.id === id) stream.response.write('event: complaints-changed\ndata: {}\n\n');
    }
  }

  async function handle(request, response, next = () => json(response, 404, { error: 'Not found.' })) {
    const url = new URL(request.url, 'http://localhost');
    const pathname = url.pathname;
    if (!pathname.startsWith('/api/')) return next();
    try {
      const origin = request.headers.origin;
      const approved = origin && origins.has(origin);
      let sameOrigin = false;
      if (origin) {
        try { sameOrigin = new URL(origin).host === request.headers.host; }
        catch { throw new RequestError('Invalid request origin.', 403); }
      }
      if (approved) {
        response.setHeader('Access-Control-Allow-Origin', origin);
        response.setHeader('Vary', 'Origin');
        response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key, X-SANARIS-Auth');
        response.setHeader('Access-Control-Max-Age', '600');
      }
      if (origin && !sameOrigin && !approved) throw new RequestError('This website is not allowed to use the report service.', 403);
      if (request.headers['sec-fetch-site'] === 'cross-site' && !approved) throw new RequestError('Cross-site requests are not allowed.', 403);
      if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
      if (pathname === '/api/health' && request.method === 'GET') return json(response, 200, { service: 'sanaris', status: 'ok' });
      if (pathname === '/api/admin/session' && request.method === 'GET') return json(response, 200, { authenticated: authenticated(request), setupRequired: !store.configured() });
      if (pathname === '/api/admin/setup' && request.method === 'POST') {
        rateLimit(request, 'auth', 10);
        if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(request.socket.remoteAddress) || approved || request.headers['x-forwarded-for']) throw new RequestError('Create the admin password on the server computer or configure it in the backend hosting settings.', 403);
        const data = await body(request);
        store.setPassword(data?.password);
        return json(response, 201, createSession(request, response));
      }
      if (pathname === '/api/admin/login' && request.method === 'POST') {
        rateLimit(request, 'auth', 10);
        const data = await body(request);
        if (!store.verifyPassword(data?.password)) throw new RequestError('The admin password is incorrect.', 401);
        return json(response, 200, createSession(request, response));
      }
      if (pathname.startsWith('/api/admin/')) {
        if (!authenticated(request)) throw new RequestError('Sign in to the admin dashboard.', 401);
        if (pathname === '/api/admin/logout' && request.method === 'POST') {
          const token = tokenFor(request);
          sessions.delete(token);
          for (const stream of streams) if (stream.token === token) { stream.response.end(); streams.delete(stream); }
          response.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0`);
          return json(response, 200, { authenticated: false });
        }
        if (pathname === '/api/admin/complaints' && request.method === 'GET') return json(response, 200, store.list());
        if (pathname === '/api/admin/complaints/events' && request.method === 'GET') return openStream(request, response, { token: tokenFor(request) });
        if (pathname === '/api/admin/complaints/import' && request.method === 'POST') {
          const count = store.importReports((await body(request))?.reports);
          publish();
          return json(response, 200, { imported: count });
        }
        const update = pathname.match(/^\/api\/admin\/complaints\/(SAN-\d{4}-[A-F0-9]{12,24})$/);
        if (update && request.method === 'PATCH') {
          const item = store.update(update[1], (await body(request))?.status);
          publish(item.id);
          return json(response, 200, item);
        }
      }
      // Resident-facing submission and tracking endpoints removed.
      // Complaints are managed exclusively through the admin dashboard.
      return json(response, 404, { error: 'Not found.' });
    } catch (error) {
      if (!response.headersSent) json(response, error instanceof RequestError ? error.status : 500, { error: error instanceof RequestError ? error.message : 'The report service could not complete this request. Please try again.' });
      else response.end();
      if (!(error instanceof RequestError)) console.error('Report service error:', error.message);
    }
  }
  return { handle, close() { clearInterval(heartbeat); for (const stream of streams) stream.response.end(); streams.clear(); store.close(); } };
}
