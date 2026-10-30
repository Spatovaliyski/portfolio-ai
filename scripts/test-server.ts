import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHandler } from '../src/server/node-http.ts';
import { testStore } from '../tests/runtime-store.ts';

if (process.env.PORTFOLIO_TEST_RUNTIME !== '1' || process.env.NODE_ENV === 'production')
  throw new Error('This isolated server is only for explicit local tests.');
const store = await testStore();
const { renderPage } = await import(pathToFileURL(resolve('dist/server/renderer.js')).href);
const handle = createHandler(store, renderPage);

createServer(async (req, res) => {
  const path = new URL(req.url!, 'http://localhost').pathname;

  if (/^\/media\/(?!.*\.\.)[a-zA-Z0-9/_.-]+$/.test(path)) {
    try {
      const bytes = await readFile(resolve('public', '.' + path));

      res.setHeader('Content-Type', path.endsWith('.png') ? 'image/png' : 'image/jpeg');
      res.end(bytes);

      return;
    } catch {
      /* Normal handler returns a proper failure. */
    }
  }
  await handle(req, res);
}).listen(4173, '127.0.0.1', () => console.log('Isolated runtime test server: 4173'));
