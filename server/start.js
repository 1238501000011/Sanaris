import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApi } from './api.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = resolve(root, 'dist');
const port = Number(process.env.PORT || 4173);
const api = createApi({ databasePath: process.env.SANARIS_DATABASE_PATH || resolve(root, 'data/sanaris.sqlite') });
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

async function staticFile(request, response) {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400); response.end('Invalid address.'); return; }
  if (pathname === '/resident') { response.writeHead(302, { Location: '/resident/' }); response.end(); return; }
  const file = resolve(publicRoot, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
  if (!file.startsWith(publicRoot + sep)) { response.writeHead(404); response.end('Not found.'); return; }
  try {
    const details = await stat(file);
    if (!details.isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': contentTypes[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' });
    if (request.method === 'HEAD') response.end();
    else createReadStream(file).on('error', () => response.destroy()).pipe(response);
  } catch { response.writeHead(404); response.end('Not found. Run npm run build before starting the server.'); }
}
const server = createServer((request, response) => api.handle(request, response, () => staticFile(request, response)));
server.listen(port, '127.0.0.1', () => {
  console.log('SANARIS admin: http://127.0.0.1:' + port + '/');
  console.log('SANARIS residents: http://127.0.0.1:' + port + '/resident/');
});
let closing = false;
function close() {
  if (closing) return;
  closing = true;
  api.close();
  server.close();
  server.closeAllConnections();
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
