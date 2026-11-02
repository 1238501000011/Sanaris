import { createServer } from 'node:http';
import { createReadStream, realpathSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { createApi } from './api.js';
import { devIdentity, devIdentityPath } from './devIdentity.js';

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };

export function createApplication({ root, publicRoot = resolve(root, 'docs'), databasePath = resolve(root, 'data/sanaris.sqlite'), allowedOrigins = [], development = false, initialPassword = '' }) {
  const canonicalPublic = realpathSync(publicRoot);
  const api = createApi({ databasePath, allowedOrigins, initialPassword });
  const identity = development ? devIdentity(root, databasePath) : null;
  async function files(request, response) {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400); response.end('Invalid address.'); return; }
    if (identity && pathname === devIdentityPath) {
      response.writeHead(200, { 'Content-Type': types['.js'].replace('text/javascript', 'application/json'), 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(identity)); return;
    }
    // Source-root Live Server links work on the local application server too.
    if (pathname === '/docs' || pathname.startsWith('/docs/')) {
      response.writeHead(302, { Location: pathname.slice(5) || '/' }); response.end(); return;
    }
    if (pathname === '/resident') { response.writeHead(302, { Location: '/resident/' }); response.end(); return; }
    const file = resolve(publicRoot, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(resolve(publicRoot) + sep)) { response.writeHead(404); response.end('Not found.'); return; }
    try {
      const actual = realpathSync(file);
      if (!actual.startsWith(canonicalPublic + sep)) throw new Error('Outside public directory');
      if (!(await stat(actual)).isFile()) throw new Error('Not a file');
      response.writeHead(200, { 'Content-Type': types[extname(actual)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
      if (request.method === 'HEAD') response.end();
      else createReadStream(actual).on('error', () => response.destroy()).pipe(response);
    } catch { response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); response.end('Page not found.'); }
  }
  const httpServer = createServer((request, response) => api.handle(request, response, () => files(request, response)));
  let closed = false;
  return {
    httpServer,
    listen(port, host = '127.0.0.1') { return new Promise((resolve, reject) => {
      const fail = error => { httpServer.off('listening', ready); reject(error); };
      const ready = () => { httpServer.off('error', fail); resolve(httpServer.address()); };
      httpServer.once('error', fail); httpServer.once('listening', ready); httpServer.listen(port, host);
    }); },
    close() {
      if (closed) return Promise.resolve();
      closed = true; api.close();
      return new Promise(resolve => { httpServer.close(resolve); httpServer.closeAllConnections(); });
    },
  };
}
