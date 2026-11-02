import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative, dirname } from 'node:path';
import { createApplication } from '../server/application.js';

const root = fileURLToPath(new URL('../', import.meta.url));

test('plain entry pages and browser modules load without a bundler; private files cannot be served', async () => {
  const app = createApplication({ root, databasePath: ':memory:' });
  const { port } = await app.listen(0);
  const base = 'http://127.0.0.1:' + port;
  try {
    for (const pathname of ['/', '/resident/']) {
      const response = await fetch(base + pathname);
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.match(html, /type="module"/);
      assert.doesNotMatch(html, /\.jsx|Loading the admin dashboard|Live Server \/ Go Live/);
      for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
        const asset = await fetch(new URL(match[1], base + pathname));
        assert.equal(asset.status, 200, match[1]);
      }
    }
    for (const filename of ['admin', 'resident', 'api', 'model', 'ui']) {
      const response = await fetch(base + '/assets/js/' + filename + '.js');
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /javascript/);
    }
    for (const pathname of ['/.env.local', '/data/sanaris.sqlite', '/server/api.js', '/.git/config', '/assets/..%2f..%2fserver/api.js', '/..%5cserver%5capi.js']) {
      assert.equal((await fetch(base + pathname)).status, 404, pathname);
    }
    assert.equal((await fetch(base + '/resident', { redirect: 'manual' })).headers.get('location'), '/resident/');
    assert.equal((await fetch(base + '/docs/resident/', { redirect: 'manual' })).headers.get('location'), '/resident/');
    assert.deepEqual(await (await fetch(base + '/api/health')).json(), { service: 'sanaris', status: 'ok' });
  } finally { await app.close(); }
});

test('all frontend module imports and CSS assets resolve inside the publish folder at a repository subpath', async () => {
  const publicRoot = resolve(root, 'docs');
  const files = await readdir(publicRoot, { recursive: true, withFileTypes: true });
  for (const entry of files.filter(entry => entry.isFile())) {
    const filename = resolve(entry.parentPath, entry.name);
    const browserPath = relative(publicRoot, filename).replaceAll('\\', '/');
    if (!/\.(js|css)$/.test(entry.name) || browserPath.includes('/vendor/')) continue;
    const source = await readFile(filename, 'utf8');
    const references = entry.name.endsWith('.js')
      ? [...source.matchAll(/^\s*import\s+(?:[^;\n]*?\s+from\s+)?['"]([^'"]+)['"]/gm)].map(match => match[1])
      : [...source.matchAll(/url\(['"]?([^)'" ]+)/g)].map(match => match[1]);
    for (const reference of references.filter(value => !value.startsWith('data:'))) {
      assert.ok(reference.startsWith('.'), 'Browser imports must be relative: ' + reference);
      const resolved = new URL(reference, 'https://example.github.io/sanaris-dashboard/' + browserPath);
      assert.ok(resolved.pathname.startsWith('/sanaris-dashboard/'), resolved.href);
      await readFile(resolve(dirname(filename), reference));
    }
  }
});
