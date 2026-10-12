import { build } from 'vite';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { loadContent } from './content.ts';
import { records, contentSchema } from '../src/domain/schema.ts';
import { routePaths, validatePublication } from '../src/domain/publication.ts';

const content = await loadContent();

if (process.env.PORTFOLIO_RELEASE_ID && !process.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  throw new Error('Configure the public admin key in CI before a production build.');
const errors = validatePublication(content, Boolean(process.env.PORTFOLIO_RELEASE_ID));

if (errors.length) throw new Error(errors.join('\n'));
await build();
await build({
  build: {
    ssr: 'src/entry-server.tsx',
    outDir: 'dist/server',
    rollupOptions: { input: 'src/entry-server.tsx' },
    emptyOutDir: true,
  },
});
const output = resolve('dist/client');

await mkdir(output, { recursive: true });
// Vite's browser output is dist/. Keep the deployable tree explicit and avoid publishing the SSR bundle.
const { cp } = await import('node:fs/promises');

await cp('dist/assets', `${output}/assets`, { recursive: true });
await mkdir(`${output}/admin`, { recursive: true });
await cp('dist/admin/index.html', `${output}/admin/index.html`);
await mkdir(`${output}/media`, { recursive: true });
for (const asset of records(content, 'media')) {
  const input = resolve('public/media', asset.path);
  const info = await stat(input);

  if (info.size > 20 * 1024 * 1024) throw new Error(`Media too large: ${asset.id}`);
  if (process.env.PORTFOLIO_RELEASE_ID && info.size !== asset.bytes)
    throw new Error(`Original size mismatch: ${asset.id}`);
  const buffer = await readFile(input);
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 24);
  const entity = content.entities.find((e) => e.id === asset.id)!;

  if (asset.mime === 'application/pdf') {
    if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Invalid CV PDF');
    await writeFile(`${output}/media/${hash}.pdf`, buffer);
    entity.data = { ...asset, id: undefined, bytes: info.size, publicPath: `/media/${hash}.pdf` };
  } else {
    const image = sharp(buffer, { limitInputPixels: 40000000 });
    const meta = await image.metadata();
    const formats: Record<string, string> = {
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      avif: 'image/avif',
      heif: 'image/avif',
    };

    if (!meta.format || formats[meta.format] !== asset.mime)
      throw new Error(`Media type mismatch: ${asset.id}`);
    const variants = [];
    const rotated = Boolean(meta.orientation && meta.orientation >= 5);
    const logicalWidth = rotated ? meta.height! : meta.width!;
    const logicalHeight = rotated ? meta.width! : meta.height!;

    for (const width of [...new Set([400, 800, 1200].map((w) => Math.min(w, logicalWidth)))]) {
      const derivative = await sharp(buffer, { limitInputPixels: 40000000 })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      const derivativeHash = createHash('sha256').update(derivative).digest('hex').slice(0, 24);
      const path = `/media/${derivativeHash}-${width}.webp`;

      await writeFile(output + path, derivative);
      variants.push({ width, path });
    }
    entity.data = {
      ...asset,
      id: undefined,
      bytes: info.size,
      width: logicalWidth,
      height: logicalHeight,
      publicPath: variants.at(-1)!.path,
      variants,
    };
  }
  delete entity.data.id;
}
const normalized = contentSchema.parse(content);
const { renderPage } = await import(pathToFileURL(resolve('dist/server/entry-server.js')).href);
const template = await readFile('dist/index.html', 'utf8');
const routes = [...routePaths(normalized), '/404/'];

await mkdir(`${output}/social`, { recursive: true });
const esc = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!,
  );
const socialPreviews: Record<string, string> = {};

for (const path of routes) {
  const item =
    records(normalized, 'project').find((p) => path.endsWith(`/${p.slug}/`)) ??
    records(normalized, 'note').find((n) => path.endsWith(`/${n.slug}/`));
  const title =
    item?.title ?? records(normalized, 'page').find((p) => p.path === path)?.eyebrow ?? 'Portfolio';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#f5f2ec"/><rect x="70" y="65" width="8" height="55" fill="#2445e8"/><text x="105" y="104" font-family="sans-serif" font-size="26" fill="#161923">MARTIN SPATOVALIYSKI</text><text x="70" y="310" font-family="sans-serif" font-weight="bold" font-size="${title.length > 30 ? 48 : 70}" fill="#2445e8">${esc(title.slice(0, 55))}</text><text x="70" y="520" font-family="sans-serif" font-size="24" fill="#525866">Engineering · Products · Selected work</text></svg>`;
  const social = await sharp(Buffer.from(svg)).png().toBuffer();
  const name = createHash('sha256').update(social).digest('hex').slice(0, 24);

  await writeFile(`${output}/social/${name}.png`, social);
  socialPreviews[path] = `/social/${name}.png`;
}

for (const path of routes) {
  const file = resolve(output, `.${path}`, 'index.html');

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, renderPage(normalized, path, template, socialPreviews));
}
const settings = records(normalized, 'settings')[0];

await writeFile(
  `${output}/sitemap.xml`,
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routePaths(
    normalized,
  )
    .map((path) => `<url><loc>${settings.siteUrl}${path}</loc></url>`)
    .join('')}</urlset>`,
);
await writeFile(
  `${output}/robots.txt`,
  `User-agent: *\nDisallow: /admin/\nSitemap: ${settings.siteUrl}/sitemap.xml\n`,
);
await writeFile(
  `${output}/release.json`,
  JSON.stringify({
    releaseId: normalized.releaseId,
    generation: normalized.generation,
    buildId: process.env.GITHUB_SHA ?? 'local',
  }),
);
await writeFile(`${output}/redirects.json`, JSON.stringify(records(normalized, 'redirect')));
await writeFile(
  `${output}/redirects.map`,
  records(normalized, 'redirect')
    .flatMap((r) =>
      [r.from, r.from.endsWith('/') ? r.from.slice(0, -1) : r.from + '/']
        .filter((from, i, all) => all.indexOf(from) === i)
        .map((from) => `"${from}" "${r.to}";`),
    )
    .join('\n'),
);
await writeFile('dist/content-snapshot.json', JSON.stringify(normalized));
console.log(
  `Generated ${routes.length} HTML routes and ${records(normalized, 'media').length} media assets. Deployment root: dist/client.`,
);
