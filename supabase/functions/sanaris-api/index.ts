import { createHandler } from './handler.js';

Deno.serve(createHandler({
  url: Deno.env.get('SUPABASE_URL'),
  key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  origins: (Deno.env.get('SANARIS_ALLOWED_ORIGINS') || 'https://1238501000011.github.io,http://localhost:5173,http://127.0.0.1:5173').split(',').map(value => value.trim()),
}));
