import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export function loadEnvironment(root) {
  // Hosting environment variables take precedence over optional local files.
  for (const name of ['.env.local', '.env']) {
    const filename = resolve(root, name);
    if (existsSync(filename)) process.loadEnvFile(filename);
  }
}

export function backendOptions(root) {
  return {
    root,
    databasePath: process.env.SANARIS_DATABASE_PATH || resolve(root, 'data/sanaris.sqlite'),
    allowedOrigins: (process.env.SANARIS_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean),
    initialPassword: process.env.SANARIS_INITIAL_ADMIN_PASSWORD || '',
  };
}
