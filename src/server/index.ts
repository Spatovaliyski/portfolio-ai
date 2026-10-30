import { createServer } from 'node:http';
import { ContentStore } from './store.ts';
import { createHandler } from './node-http.ts';
import { renderPage } from '../entry-server.tsx';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* production environment */
}
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) throw new Error('Configure the protected Supabase runtime environment.');
const port = Number(process.env.PORT ?? 4173);

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
createServer(createHandler(new ContentStore(url, key), renderPage)).listen(port, '127.0.0.1', () =>
  console.log(`Portfolio runtime listening on 127.0.0.1:${port}`),
);
