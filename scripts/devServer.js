import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { devIdentity, devIdentityPath } from '../server/devIdentity.js';
import { loadEnvironment, backendOptions } from '../server/environment.js';

export function parseDevOptions(args) {
  const options = { port: 5173, open: false, help: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') { options.help = true; continue; }
    if (arg === '--strictPort') continue;
    if (arg === '--no-open') { options.open = false; continue; }
    if (arg === '--port' || arg.startsWith('--port=')) {
      const value = arg === '--port' ? args[++index] : arg.slice(7);
      if (!/^\d+$/.test(value ?? '') || Number(value) < 1 || Number(value) > 65535) throw new Error('Use a port number from 1 to 65535, for example --port 5180.');
      options.port = Number(value);
      continue;
    }
    if (arg === '--host' || arg.startsWith('--host=')) {
      const value = arg === '--host' ? args[++index] : arg.slice(7);
      if (!['127.0.0.1', 'localhost'].includes(value)) throw new Error('The local SANARIS launcher uses 127.0.0.1. Use --host 127.0.0.1.');
      continue;
    }
    if (arg === '--open' || arg.startsWith('--open=')) {
      options.open = arg === '--open'
        ? (args[index + 1] && !args[index + 1].startsWith('-') ? args[++index] : '/#/admin/overview')
        : arg.slice(7) || '/#/admin/overview';
      continue;
    }
    throw new Error('Unknown option ' + arg + '. Run npm run dev -- --help for supported options.');
  }
  if (options.open) browserUrl('http://127.0.0.1:' + options.port, options.open);
  return options;
}

export function browserUrl(origin, pathname) {
  const url = new URL(pathname, origin + '/');
  if (url.origin !== origin || url.username || url.password) throw new Error('--open must point to a page on this SANARIS server.');
  return url.href;
}

export async function inspectDevServer(origin, expected) {
  let response;
  try {
    response = await fetch(origin + devIdentityPath, { signal: AbortSignal.timeout(1500), redirect: 'error' });
  } catch (error) {
    return { state: error.cause?.code === 'ECONNREFUSED' ? 'stopped' : 'unresponsive' };
  }
  const identity = await response.json().catch(() => null);
  if (!response.ok || identity?.app !== expected.app || identity?.service !== expected.service || identity?.protocol !== expected.protocol) return { state: 'occupied' };
  if (identity.fingerprint !== expected.fingerprint) return { state: 'different-project' };
  try {
    const apiResponse = await fetch(origin + '/api/admin/session', { signal: AbortSignal.timeout(1500), redirect: 'error' });
    const status = await apiResponse.json();
    if (apiResponse.ok && typeof status?.authenticated === 'boolean' && typeof status?.setupRequired === 'boolean') return { state: 'ready' };
  } catch { /* A matching site still needs a working report service. */ }
  return { state: 'unhealthy' };
}

function openBrowser(url) {
  const command = process.platform === 'win32' ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
  child.on('error', () => console.warn('Could not open the browser automatically. Open ' + url));
  child.unref();
}

function showReady(origin, reused, open) {
  console.log(reused ? 'SANARIS is already running for this project. Reusing the existing server.' : 'SANARIS started successfully.');
  console.log('  Admin: ' + origin + '/#/admin/overview');
  console.log('  Residents: ' + origin + '/resident/#/report');
  console.log(reused ? 'Keep the original server terminal open. This command can close.' : 'Keep this terminal open. Press Ctrl+C to stop the server.');
  console.log('SANARIS: ready');
  if (open) openBrowser(browserUrl(origin, open));
}

function conflictMessage(state, port) {
  if (state === 'unhealthy') return 'SANARIS is listening on port ' + port + ', but its report API is unavailable. Check the original server terminal.';
  if (state === 'unresponsive') return 'Port ' + port + ' did not respond in time. Check the running server and try again.';
  const owner = state === 'different-project' ? 'a different SANARIS folder or database' : 'another application';
  return 'Port ' + port + ' is used by ' + owner + '. Stop that server or choose another port with npm run dev -- --port 5180.';
}

export async function startDevServer(root, args) {
  const options = parseDevOptions(args);
  if (options.help) {
    console.log('Usage: npm run dev -- [--port 5173] [--open [/resident/#/report]] [--no-open]');
    console.log('Starts SANARIS locally, or reuses a healthy server for the same project and database.');
    return;
  }
  process.chdir(root);
  loadEnvironment(root);
  const backend = backendOptions(root);
  const { databasePath } = backend;
  const expected = devIdentity(root, databasePath);
  const origin = 'http://127.0.0.1:' + options.port;
  console.log('SANARIS: starting');
  const existing = await inspectDevServer(origin, expected);
  if (existing.state === 'ready') { showReady(origin, true, options.open); return; }
  if (existing.state !== 'stopped') throw new Error(conflictMessage(existing.state, options.port));

  let server;
  try {
    // The frontend is already browser-ready; no bundler or compiler is needed.
    const { createApplication } = await import('../server/application.js');
    server = createApplication({ ...backend, development: true });
    await server.listen(options.port);
  } catch (error) {
    await server?.close();
    // Another IDE may have finished starting the same project after the first check.
    let concurrent;
    for (let attempt = 0; attempt < 8; attempt++) {
      concurrent = await inspectDevServer(origin, expected);
      if (concurrent.state === 'ready') { showReady(origin, true, options.open); return; }
      if (['occupied', 'different-project'].includes(concurrent.state)) break;
      await delay(250);
    }
    if (concurrent?.state !== 'stopped') throw new Error(conflictMessage(concurrent.state, options.port));
    throw error;
  }
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    await server.close();
    process.off('SIGINT', shutdown);
    process.off('SIGTERM', shutdown);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  showReady(origin, false, options.open);
}
