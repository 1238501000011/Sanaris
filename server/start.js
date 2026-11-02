import '../scripts/check-runtime.mjs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadEnvironment, backendOptions } from './environment.js';

if (!process.exitCode) {
  let application;
  try {
    const root = fileURLToPath(new URL('../', import.meta.url));
    loadEnvironment(root);
    const port = Number(process.env.PORT || 4173);
    const host = process.env.HOST || '127.0.0.1';
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535.');
    const { createApplication } = await import('./application.js');
    application = createApplication({ ...backendOptions(root), ...(process.argv.includes('--preview') ? { publicRoot: resolve(root, 'dist') } : {}) });
    await application.listen(port, host);
    console.log('SANARIS listening on ' + host + ':' + port);
    console.log('Admin: /#/admin/overview | Residents: /resident/#/report | Health: /api/health');
    const shutdown = () => application.close();
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    await application?.close();
    console.error('SANARIS could not start: ' + error.message);
    process.exitCode = 1;
  }
}
