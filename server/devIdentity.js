import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';

export const devIdentityPath = '/__sanaris/dev-server';

function canonicalPath(filename) {
  let value = resolve(filename);
  const missingParts = [];
  // Resolve the existing parent too, so short Windows paths and symlinks stay
  // consistent before and after a new database file is created.
  for (;;) {
    try { value = realpathSync.native(value); break; }
    catch {
      const parent = dirname(value);
      if (parent === value) break;
      missingParts.unshift(basename(value));
      value = parent;
    }
  }
  value = resolve(value, ...missingParts);
  return process.platform === 'win32' ? value.toLowerCase() : value;
}

export function devIdentity(root, databasePath) {
  const fingerprint = createHash('sha256')
    .update(canonicalPath(root) + '\0' + canonicalPath(databasePath))
    .digest('hex');
  // Identify the installation without returning filesystem paths or report data.
  return { app: 'SANARIS', service: 'development', protocol: 1, fingerprint };
}
