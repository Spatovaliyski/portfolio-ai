import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const root = resolve('dist/client');
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
};
const redirects = JSON.parse(await readFile(`${root}/redirects.json`, 'utf8')) as Array<{
  from: string;
  to: string;
}>;

createServer(async (req, res) => {
  try {
    const url = new URL(req.url!, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);

    if (pathname.startsWith('/404/')) res.statusCode = 404;
    const redirect = redirects.find(
      (item) => item.from.replace(/\/$/, '') === pathname.replace(/\/$/, ''),
    );

    if (redirect) {
      res.writeHead(301, { Location: redirect.to + url.search });
      res.end();

      return;
    }
    let path = resolve(root, `.${pathname}`);

    if (!path.startsWith(root + '/') && !path.startsWith(root + '\\') && path !== root) {
      res.writeHead(400);
      res.end();

      return;
    }
    try {
      if ((await stat(path)).isDirectory()) {
        if (!pathname.endsWith('/')) {
          res.writeHead(301, { Location: pathname + '/' + url.search });
          res.end();

          return;
        }
        path = resolve(path, 'index.html');
      }
      await stat(path);
    } catch {
      path = `${root}/404/index.html`;
      res.statusCode = 404;
    }
    res.setHeader('Content-Type', types[extname(path)] ?? 'application/octet-stream');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', pathname.startsWith('/admin') ? 'no-store' : 'no-cache');
    res.end(await readFile(path));
  } catch {
    res.writeHead(400);
    res.end('Bad request');
  }
}).listen(4173, '127.0.0.1', () => console.log('Production preview: http://127.0.0.1:4173'));
