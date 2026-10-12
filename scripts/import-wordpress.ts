import { readFile, writeFile, mkdir, stat, cp } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { importWordPress, type WP, type LegacyMedia } from './wordpress.ts';
import './machine.ts';

const archive = resolve(
  process.argv.find((arg) => arg.startsWith('--archive='))?.slice(10) ?? 'migration-export',
);
const read = async <T>(name: string) =>
  JSON.parse(await readFile(resolve(archive, `${name}.json`), 'utf8')) as T;
const collections = {
  projects: await read<WP[]>('work_projects'),
  experience: await read<WP[]>('work_experience'),
  posts: await read<WP[]>('posts'),
  media: await read<LegacyMedia[]>('media-manifest'),
};
const sourcePath = (item: LegacyMedia) =>
  resolve(archive, 'originals', item.path.split('/').at(-1)!);
const sizes: Record<number, number> = {};

for (const item of collections.media)
  if (item.downloaded) sizes[item.id] = (await stat(sourcePath(item))).size;
const { entities, issues } = importWordPress(collections, sizes);

await mkdir('content', { recursive: true });
await writeFile('content/imported-drafts.json', JSON.stringify(entities, null, 2));
await writeFile(
  resolve(archive, 'import-report.json'),
  JSON.stringify(
    {
      source: 'https://wp.spatovaliyski.com',
      counts: {
        projects: collections.projects.length,
        experience: collections.experience.length,
        notes: collections.posts.length,
        originals: collections.media.length,
        mediaRecords: entities.filter((e) => e.kind === 'media').length,
        entities: entities.length,
      },
      issues,
    },
    null,
    2,
  ),
);
if (process.argv.includes('--local')) {
  for (const entity of entities.filter((e) => e.kind === 'media')) {
    const item = collections.media.find((m) => entity.id === `wp-spatovaliyski-media-${m.id}`)!;
    const dest = resolve('public/media', String(entity.data.path));

    await mkdir(dirname(dest), { recursive: true });
    await cp(sourcePath(item), dest, { force: false });
  }
} else {
  const token = process.env.PORTFOLIO_OWNER_ACCESS_TOKEN;

  if (!token)
    throw new Error(
      'Prepared locally. Import requires a verified owner MFA access token in the environment.',
    );
  const client = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
  );
  const { data: rows, error } = await client.from('portfolio_entities').select('id');

  if (error) throw error;
  const existing = new Set(rows.map((row) => row.id));

  for (const entity of entities) {
    if (existing.has(entity.id)) continue;
    if (entity.kind === 'media') {
      const item = collections.media.find((m) => entity.id === `wp-spatovaliyski-media-${m.id}`)!;
      const bytes = await readFile(sourcePath(item));
      const old = await client.storage
        .from('portfolio-originals')
        .download(String(entity.data.path));

      if (old.data) {
        if (!bytes.equals(Buffer.from(await old.data.arrayBuffer())))
          throw new Error(`Immutable media collision: ${entity.id}`);
      } else {
        const { error } = await client.storage
          .from('portfolio-originals')
          .upload(String(entity.data.path), bytes, {
            contentType: String(entity.data.mime),
            upsert: false,
          });

        if (error) throw error;
      }
    }
    const { error } = await client.functions.invoke('content', {
      body: { action: 'save', entity, expectedVersion: 0 },
    });

    if (error) throw error;
    existing.add(entity.id);
  }
}
console.log(
  `Prepared ${entities.length} private draft records; ${issues.length} editorial review items. Existing source IDs remain unchanged.`,
);
