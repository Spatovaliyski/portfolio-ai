import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { entitySchema, records, type PortfolioContent } from '../domain/schema.ts';
import { routePaths } from '../domain/publication.ts';
import { ContentStore, HttpError, checked } from './store.ts';
import { storeMedia } from './media.ts';
import type { processMedia } from './media.ts';

const saveSchema = z
  .object({
    entity: entitySchema,
    expectedVersion: z.number().int().nonnegative(),
    requestKey: z.uuid(),
  })
  .strict();
const escapeXml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
const types: Record<string, string> = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
};

async function body(req: IncomingMessage, limit: number) {
  const buffers: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'File or request is too large.');
    buffers.push(Buffer.from(chunk));
  }

  return Buffer.concat(buffers);
}

function json(res: ServerResponse, value: unknown, status = 200) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(value));
}

export interface HttpRuntime {
  template(): Promise<string>;
  asset(path: string): Promise<Buffer>;
  processMedia: (bytes: Buffer, mime: string) => ReturnType<typeof processMedia>;
  socialPreview(title: string): Promise<Buffer>;
}

export function createHandler(
  store: ContentStore,
  render: (
    content: PortfolioContent,
    path: string,
    template: string,
    previews: Record<string, string>,
  ) => string,
  runtime: HttpRuntime,
) {
  const rendered = new Map<string, string>();
  let cached: PortfolioContent | null = null;

  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const path = decodeURIComponent(url.pathname);

      if (path.includes('\0') || path.includes('\\') || path.split('/').includes('..'))
        throw new HttpError(400, 'Invalid path.');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (path === '/healthz') {
        await store.live();
        json(res, { ok: true });

        return;
      }
      if (path.startsWith('/api/admin/')) {
        const origin = req.headers.origin;

        if (
          origin &&
          ![
            'https://spatovaliyski.com',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'http://127.0.0.1:4173',
          ].includes(origin)
        )
          throw new HttpError(403, 'Forbidden origin.');
        const client = await store.owner(
          (req.headers.authorization ?? '').replace(/^Bearer /i, ''),
        );

        if (path === '/api/admin/content' && req.method === 'GET') {
          json(res, { entities: await store.rows(client), content: await store.live() });

          return;
        }
        if (path === '/api/admin/content' && req.method === 'POST') {
          const input = saveSchema.parse(JSON.parse((await body(req, 300000)).toString()));

          if (input.entity.status === 'draft')
            throw new HttpError(
              400,
              'Save publishes content; use an unsaved form for unfinished work.',
            );
          json(
            res,
            await store.save(client, input.entity, input.expectedVersion, input.requestKey),
          );

          return;
        }
        const history = path.match(/^\/api\/admin\/content\/([a-zA-Z0-9_-]+)\/history$/);

        if (history && req.method === 'GET') {
          json(res, {
            revisions: checked(
              await client
                .from('portfolio_revisions')
                .select('id,version,entity,created_at')
                .eq('entity_id', history[1])
                .order('version', { ascending: false })
                .limit(30),
            ),
          });

          return;
        }
        if (path === '/api/admin/media' && req.method === 'POST') {
          const media = await runtime.processMedia(
            await body(req, 20 * 1024 * 1024),
            String(req.headers['content-type'] ?? '').split(';')[0],
          );
          const filename = decodeURIComponent(String(req.headers['x-file-name'] ?? '')).slice(
            0,
            180,
          );

          media.entity.data.caption = filename || 'Portfolio image';
          media.entity.data.alt = req.headers['x-image-description']
            ? decodeURIComponent(String(req.headers['x-image-description']))
            : String(media.entity.data.caption)
                .replace(/\.[a-zA-Z0-9]+$/, '')
                .replace(/[_-]/g, ' ');
          await storeMedia(client, 'portfolio-originals', [media.originals]);
          await storeMedia(client, 'portfolio-media', media.derivatives);
          const result = await store.save(client, media.entity, 0, randomUUID());

          json(res, { entity: media.entity, ...result }, 201);

          return;
        }
        throw new HttpError(404, 'Unknown editor endpoint.');
      }
      if (!['GET', 'HEAD'].includes(req.method ?? ''))
        throw new HttpError(405, 'GET or HEAD required.');
      if (
        path.startsWith('/assets/') ||
        path.startsWith('/admin') ||
        path === '/social-preview.svg'
      ) {
        const file = path === '/admin' || path === '/admin/' ? '/admin/index.html' : path;
        let bytes: Buffer;

        try {
          bytes = await runtime.asset(file);
        } catch {
          throw new HttpError(404, 'File not found.');
        }
        res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
        res.setHeader(
          'Cache-Control',
          path.startsWith('/admin') ? 'no-store' : 'public, max-age=31536000, immutable',
        );
        if (path.startsWith('/admin')) res.setHeader('X-Robots-Tag', 'noindex, nofollow');
        res.end(req.method === 'HEAD' ? undefined : bytes);

        return;
      }
      if (path.startsWith('/media/')) {
        if (!/^\/media\/[a-zA-Z0-9_-]+\.(webp|pdf)$/.test(path))
          throw new HttpError(404, 'Image not found.');
        const response = await fetch(
          `${store.url}/storage/v1/object/public/portfolio-media/${path.slice(7)}`,
          { signal: AbortSignal.timeout(10000) },
        );

        if (!response.ok)
          throw new HttpError(response.status === 404 ? 404 : 503, 'Image unavailable.');
        res.setHeader(
          'Content-Type',
          response.headers.get('content-type') ?? 'application/octet-stream',
        );
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.end(req.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));

        return;
      }
      const content = await store.live();

      if (cached?.releaseId !== content.releaseId) rendered.clear();
      cached = content;
      const etag = `"${content.releaseId}"`;

      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('ETag', etag);
      if (path === '/api/content') {
        if (req.headers['if-none-match'] === etag) {
          res.writeHead(304);
          res.end();

          return;
        }
        json(res, content);

        return;
      }
      if (path === '/robots.txt') {
        res.setHeader('Content-Type', 'text/plain');
        res.end(
          'User-agent: *\nDisallow: /admin/\nSitemap: https://spatovaliyski.com/sitemap.xml\n',
        );

        return;
      }
      if (path === '/sitemap.xml') {
        res.setHeader('Content-Type', 'application/xml');
        res.end(
          `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routePaths(
            content,
          )
            .map((p) => `<url><loc>${escapeXml('https://spatovaliyski.com' + p)}</loc></url>`)
            .join('')}</urlset>`,
        );

        return;
      }
      if (path === '/social/preview.png') {
        const route = url.searchParams.get('path') ?? '/';
        const title =
          records(content, 'project').find((p) => route.endsWith(`/${p.slug}/`))?.title ??
          records(content, 'note').find((p) => route.endsWith(`/${p.slug}/`))?.title ??
          records(content, 'page').find((p) => p.path === route)?.eyebrow ??
          'Portfolio';

        res.setHeader('Content-Type', 'image/png');
        const preview = await runtime.socialPreview(title);

        res.end(req.method === 'HEAD' ? undefined : preview);

        return;
      }
      const redirect = records(content, 'redirect').find(
        (r) => r.from.replace(/\/$/, '') === path.replace(/\/$/, ''),
      );

      if (redirect) {
        res.writeHead(301, { Location: redirect.to + url.search });
        res.end();

        return;
      }
      const normalized = path === '/' ? path : path.replace(/\/$/, '') + '/';
      const found = routePaths(content).includes(normalized);

      if (found && normalized !== path) {
        res.writeHead(301, { Location: normalized + url.search });
        res.end();

        return;
      }
      const renderPath = found ? normalized : '/404/';

      if (!found) res.statusCode = 404;
      const key = renderPath;
      let html = rendered.get(key);

      if (!html) {
        const previews = Object.fromEntries(
          routePaths(content).map((p) => [p, `/social/preview.png?path=${encodeURIComponent(p)}`]),
        );

        html = render(content, renderPath, await runtime.template(), previews);
        if (rendered.size < 100) rendered.set(key, html);
      }
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(req.method === 'HEAD' ? undefined : html);
    } catch (error) {
      const status =
        error instanceof HttpError
          ? error.status
          : error instanceof z.ZodError || error instanceof SyntaxError || error instanceof URIError
            ? 400
            : 503;
      const message =
        error instanceof HttpError
          ? error.message
          : error instanceof z.ZodError
            ? error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
            : status === 400
              ? 'Invalid request.'
              : 'Service temporarily unavailable. Your changes have not been applied.';

      console.error(JSON.stringify({ event: 'request_failed', status }));
      if (!res.headersSent) json(res, { error: message }, status);
      else res.end();
    }
  };
}
