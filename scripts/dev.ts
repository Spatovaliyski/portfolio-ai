import { createServer } from 'node:http';
import { createServer as createViteServer } from 'vite';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { ContentStore } from '../src/server/store.ts';
import { createHandler } from '../src/server/http.ts';

try {
  process.loadEnvFile('.env.local');
} catch {
  /* host env */
}

const { values } = parseArgs({ options: { port: { type: 'string', default: '5173' } } });
const port = Number(values.port);

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Provide a valid --port.');

// SSR sends readable HTML before the client module runs. Native stylesheet links
// must block its first paint; Vite's development JS imports inject styles too late.
function withStylesheets(template: string, admin = false): string {
  const stylesheets = ['/src/styles/global.css', '/src/public/app.module.css'];

  if (admin) stylesheets.push('/src/admin/admin.css');

  return template.replace(
    '</head>',
    `${stylesheets.map((path) => `<link rel="stylesheet" href="${path}?direct">`).join('')} </head>`,
  );
}
const isolated =
  process.env.PORTFOLIO_TEST_RUNTIME === '1'
    ? await (await import('../tests/runtime-store.ts')).testStore()
    : null;
const server = createServer();
const vite = await createViteServer({
  server: { middlewareMode: true, hmr: { server } },
  appType: 'custom',
});

server.on('request', (req, res) =>
  vite.middlewares(req, res, async () => {
    try {
      const path = new URL(req.url!, 'http://localhost').pathname;

      if (path.startsWith('/admin')) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(
          await vite.transformIndexHtml(
            '/admin/',
            withStylesheets(await readFile('admin/index.html', 'utf8'), true),
          ),
        );

        return;
      }
      const store =
        isolated ??
        new ContentStore(
          process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
        );
      const { renderPage } = await vite.ssrLoadModule('/src/entry-server.tsx');

      await createHandler(store, renderPage, undefined, async () =>
        vite.transformIndexHtml(path, withStylesheets(await readFile('index.html', 'utf8'))),
      )(req, res);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      res.statusCode = 500;
      res.end('Unable to render this page. See the development terminal.');
      console.error(error);
    }
  }),
);
server.listen(port, '127.0.0.1', () =>
  console.log(`Portfolio: http://127.0.0.1:${port} · editor: /admin/`),
);
