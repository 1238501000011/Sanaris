import './check-runtime.mjs';
import { fileURLToPath } from 'node:url';
import { startDevServer } from './devServer.js';

if (!process.exitCode) {
  try { await startDevServer(fileURLToPath(new URL('../', import.meta.url)), process.argv.slice(2)); }
  catch (error) { console.error('SANARIS could not start: ' + error.message); process.exitCode = 1; }
}
