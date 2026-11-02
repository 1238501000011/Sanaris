import { resolve } from 'node:path';
import { createApi } from './api.js';
import { devIdentity, devIdentityPath } from './devIdentity.js';

export default function complaintsApi() {
  let api;
  function closeApi() {
    const previous = api;
    api = null;
    previous?.close();
  }
  return {
    name: 'sanaris-complaints-api',
    configureServer(server) {
      const databasePath = process.env.SANARIS_DATABASE_PATH || resolve(server.config.root, 'data/sanaris.sqlite');
      const identity = devIdentity(server.config.root, databasePath);
      server.middlewares.use((request, response, next) => {
        if (request.method !== 'GET' || request.url?.split('?')[0] !== devIdentityPath) return next();
        response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify(identity));
      });
      api = createApi({ databasePath });
      server.middlewares.use(api.handle);
      server.httpServer?.once('close', closeApi);
    },
    configurePreviewServer(server) {
      api = createApi({ databasePath: process.env.SANARIS_DATABASE_PATH || resolve(server.config.root, 'data/sanaris.sqlite') });
      server.middlewares.use(api.handle);
      server.httpServer?.once('close', closeApi);
    },
    closeBundle: closeApi,
  };
}
