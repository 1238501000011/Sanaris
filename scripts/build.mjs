import { cp, mkdir, realpath, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const destination = resolve(root, 'dist');
// Only replace this project's generated directory; never follow a linked target.
if (existsSync(destination) && await realpath(destination) !== destination) throw new Error('dist must be a regular directory inside this project.');
if (destination !== resolve(root, 'dist')) throw new Error('Invalid build destination.');
await rm(destination, { recursive: true, force: true });
await mkdir(destination);
await cp(resolve(root, 'docs'), destination, { recursive: true });
console.log('Copied browser-ready HTML, CSS, and JavaScript to dist/. GitHub Pages can publish docs/ directly.');
