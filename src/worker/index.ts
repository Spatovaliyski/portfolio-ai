import { createServer } from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import { env } from 'cloudflare:workers';
import type { Fetcher, ImagesBinding } from '@cloudflare/workers-types';
import { createHandler } from '../server/http.ts';
import { ContentStore, HttpError } from '../server/store.ts';
import { processMedia } from '../server/media.ts';
import { imageProcessor } from './images.ts';
import { renderSocialPreview } from './social.ts';
import { renderPage } from '../entry-server.tsx';

interface Environment {
  ASSETS: Fetcher;
  IMAGES: ImagesBinding;
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
}

const bindings = env as unknown as Environment;
const store = new ContentStore(bindings.SUPABASE_URL, bindings.SUPABASE_PUBLISHABLE_KEY);
const images = imageProcessor(bindings.IMAGES);

async function asset(path: string) {
  const response = await bindings.ASSETS.fetch('https://assets.invalid' + path);

  if (!response.ok) throw new HttpError(404, 'File not found.');

  return Buffer.from(await response.arrayBuffer());
}

const handler = createHandler(store, renderPage, {
  template: async () => (await asset('/index.html')).toString(),
  asset,
  processMedia: (bytes, mime) => processMedia(images, bytes, mime),
  async socialPreview(title) {
    return renderSocialPreview(title, await asset('/assets/social-font.ttf'));
  },
});
const server = createServer(handler);

server.listen(8080);
const http = httpServerHandler({ port: 8080 });

export default {
  fetch(request: Request) {
    const url = new URL(request.url);

    if (url.hostname === 'www.spatovaliyski.com') {
      url.hostname = 'spatovaliyski.com';
      url.protocol = 'https:';

      return Response.redirect(url.toString(), 308);
    }

    return http.fetch(request);
  },
  async scheduled() {
    // External traffic reaches the database through the public-content Edge Function.
    // Unlike an internal pg_cron job, this exercises the project's public API too.
    await store.live();
    console.log(JSON.stringify({ event: 'supabase_keep_alive', ok: true }));
  },
};
