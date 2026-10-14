import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseCli } from './supabase-cli.ts';
import { backupTables, verifyBackup, type BackupManifest } from './backup-format.ts';
import { checked, type ContentRow } from '../src/server/store.ts';

const project = 'lmxukzcvxhpbwtgsbrai';

if ((await readFile('supabase/.temp/project-ref', 'utf8')).trim() !== project)
  throw new Error('Wrong linked project.');
// Privileged keys stay in memory and are never written to backups or logs.
const revealed = JSON.parse(
  supabaseCli(['projects', 'api-keys', '--project-ref', project, '--reveal', '--output', 'json']),
);
const keys = Array.isArray(revealed) ? revealed : revealed.rows;
const secret = keys.find(
  (k: { name: string; type?: string }) => k.name === 'service_role' || k.type === 'secret',
)?.api_key;

if (!secret) throw new Error('Trusted project key unavailable.');
const client = createClient(`https://${project}.supabase.co`, secret, {
  auth: { persistSession: false },
});
const meta = JSON.parse(
  supabaseCli([
    'db',
    'query',
    '--linked',
    '--output',
    'json',
    'select (select user_id from portfolio_private.owner) as owner, public.portfolio_release_status() as control; ',
  ]),
).rows[0];
const directory = resolve(
  'backups',
  'before-live-' + new Date().toISOString().replace(/[:.]/g, '-'),
);
const manifest: BackupManifest = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  project,
  ownerId: meta.owner,
  control: meta.control,
  files: [],
};

async function save(path: string, bytes: Buffer) {
  await mkdir(dirname(resolve(directory, path)), { recursive: true });
  await writeFile(resolve(directory, path), bytes);
  manifest.files.push({
    path,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
for (const table of backupTables) {
  const rows: unknown[] = [];

  for (let offset = 0; ; offset += 1000) {
    let query = client.from(table).select('*');

    query =
      table === 'portfolio_entity_links'
        ? query.order('source_id').order('target_id')
        : query.order(
            table === 'portfolio_revisions'
              ? 'created_at'
              : table === 'portfolio_releases'
                ? 'generation'
                : 'id',
          );
    const batch = checked(await query.range(offset, offset + 999)) ?? [];

    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  await save(table + '.json', Buffer.from(JSON.stringify(rows)));
}

async function originals(prefix = '') {
  for (let offset = 0; ; offset += 1000) {
    const items =
      checked(
        await client.storage.from('portfolio-originals').list(prefix, { offset, limit: 1000 }),
      ) ?? [];

    for (const item of items) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;

      if (!/^(?!.*\.\.)[a-zA-Z0-9/_.-]+$/.test(path)) throw new Error('Invalid original path.');
      if (!item.id) await originals(path);
      else {
        const blob = checked(await client.storage.from('portfolio-originals').download(path));

        if (!blob) throw new Error('Original unavailable.');
        await save('media/' + path, Buffer.from(await blob.arrayBuffer()));
      }
    }
    if (items.length < 1000) break;
  }
}
await originals();
for (const file of (await readdir('supabase/migrations')).filter((f) => f.endsWith('.sql')).sort())
  await save('migrations/' + file, await readFile('supabase/migrations/' + file));
const rows = JSON.parse(
  await readFile(resolve(directory, 'portfolio_entities.json'), 'utf8'),
) as ContentRow[];

for (const row of rows.filter((r) => r.kind === 'media')) {
  const path = String(row.data.path);

  if (!/^(?!.*\.\.)[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp|avif|pdf)$/.test(path))
    throw new Error('Unexpected media path.');
  try {
    await save('existing-local-media/' + path, await readFile(resolve('public/media', path)));
  } catch (e) {
    if (!(e instanceof Error) || !('code' in e) || e.code !== 'ENOENT') throw e;
  }
}
await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(manifest, null, 2));
await verifyBackup(directory);
await mkdir('.cache', { recursive: true });
await writeFile('.cache/live-backup-directory.txt', directory);
console.log('Verified read-only database and media backup: ' + directory);
