import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { devIdentity, devIdentityPath } from '../server/devIdentity.js';
import { parseDevOptions, browserUrl, inspectDevServer } from '../scripts/devServer.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const databasePath = resolve(root, '.npm-cache/startup-test.sqlite');
const identity = devIdentity(root, databasePath);

async function withServer(identityBody, apiStatus, check) {
  const requests = [];
  const server = createServer((request, response) => {
    requests.push({ path: request.url, method: request.method });
    if (request.url === devIdentityPath) {
      response.writeHead(200, { 'Content-Type': typeof identityBody === 'string' ? 'text/html' : 'application/json' });
      response.end(typeof identityBody === 'string' ? identityBody : JSON.stringify(identityBody));
    } else if (request.url === '/api/admin/session') {
      response.writeHead(apiStatus, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(apiStatus === 200 ? { authenticated: false, setupRequired: true } : { error: 'Unavailable' }));
    } else { response.writeHead(404); response.end(); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await check(server.address().port, requests); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

function runLauncher(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [resolvePath('scripts/dev.mjs'), '--port', String(port)], {
      cwd: fileURLToPath(new URL('../', new URL('../', import.meta.url))),
      env: { ...process.env, SANARIS_DATABASE_PATH: databasePath }, windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Launcher did not finish: ' + output)); }, 10000);
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('exit', code => { clearTimeout(timeout); resolve({ code, output }); });
  });
}
const resolvePath = filename => resolve(root, filename);

test('installation identity stays stable when a new database directory is created', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'sanaris-identity-test-'));
  try {
    const database = join(folder, 'new-data', 'reports.sqlite');
    const before = devIdentity(root, database);
    await mkdir(dirname(database));
    await writeFile(database, '');
    assert.deepEqual(devIdentity(root, database), before);
  } finally {
    if (dirname(folder) === resolve(tmpdir()) && basename(folder).startsWith('sanaris-identity-test-')) await rm(folder, { recursive: true, force: true });
  }
});

test('repeated startup reuses a healthy server for the same project and database', async () => {
  await withServer(identity, 200, async (port, requests) => {
    const result = await runLauncher(port);
    assert.equal(result.code, 0, result.output);
    assert.match(result.output, /already running for this project/);
    assert.match(result.output, /SANARIS: ready/);
    assert.ok(result.output.includes('http://127.0.0.1:' + port + '/#/admin/overview'));
    assert.doesNotMatch(result.output, /ExperimentalWarning|Re-optimizing|Port \d+ is already in use/);
    assert.deepEqual(requests, [{ path: devIdentityPath, method: 'GET' }, { path: '/api/admin/session', method: 'GET' }]);
  });
});

test('another SANARIS installation or database cannot be mistaken for this project', async () => {
  const other = devIdentity(root, databasePath + '.other');
  assert.notEqual(other.fingerprint, identity.fingerprint);
  await withServer(other, 200, async (port, requests) => {
    const result = await runLauncher(port);
    assert.equal(result.code, 1);
    assert.match(result.output, /different SANARIS folder or database/);
    assert.doesNotMatch(result.output, /SANARIS: ready/);
    assert.equal(requests.some(request => request.path === '/api/admin/session'), false);
  });
});

test('an unrelated application stays running and receives no report API requests', async () => {
  await withServer('<html>Another application</html>', 200, async (port, requests) => {
    const result = await runLauncher(port);
    assert.equal(result.code, 1);
    assert.match(result.output, /another application/);
    assert.match(result.output, /--port 5180/);
    assert.equal(requests.length, 1);
    assert.equal((await fetch('http://127.0.0.1:' + port)).status, 404, 'the unrelated server was not stopped');
  });
});

test('an unavailable report API is not reported as a successful startup', async () => {
  await withServer(identity, 503, async port => {
    const result = await runLauncher(port);
    assert.equal(result.code, 1);
    assert.match(result.output, /report API is unavailable/);
    assert.doesNotMatch(result.output, /SANARIS: ready/);
  });
});

test('a free port is distinguished from a conflicting server', async () => {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  assert.deepEqual(await inspectDevServer('http://127.0.0.1:' + port, identity), { state: 'stopped' });
});

test('custom ports and browser targets stay explicit and local', () => {
  assert.deepEqual(parseDevOptions(['--port', '5180', '--open', '/#/admin/overview', '--strictPort']), { port: 5180, open: '/#/admin/overview', help: false });
  assert.equal(parseDevOptions(['--host', '127.0.0.1', '--open', '--no-open']).open, false);
  for (const args of [['--port'], ['--port=-1'], ['--port', '65536'], ['--open', 'https://example.com'], ['--open', '//example.com']]) assert.throws(() => parseDevOptions(args));
  assert.equal(browserUrl('http://127.0.0.1:5180', '/#/admin/overview'), 'http://127.0.0.1:5180/#/admin/overview');
  assert.equal(JSON.stringify(identity).includes(root), false);
});
