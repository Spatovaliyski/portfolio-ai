import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { backupTables, type BackupManifest, verifyBackup } from './backup-format.ts';
import './machine.ts';

const token = process.env.PORTFOLIO_OWNER_ACCESS_TOKEN;

if (!token) throw new Error('Owner MFA token required');
const client = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
  { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } },
);
const { data: identity, error: authError } = await client.auth.getUser(token);

if (authError || !identity.user) throw new Error('Authenticated owner required');
const { data: dashboard, error: dashboardError } = await client.functions.invoke('content', {
  body: { action: 'list' },
});

if (dashboardError) throw dashboardError;
const directory = resolve('backups', new Date().toISOString().replace(/[:.]/g, '-'));

await mkdir(directory, { recursive: true });
const manifest: BackupManifest = {
  schemaVersion: 1,
  createdAt: new Date().toISOString(),
  project: 'lmxukzcvxhpbwtgsbrai',
  ownerId: identity.user.id,
  control: dashboard.control,
  files: [],
};

async function save(path: string, bytes: Uint8Array) {
  const file = resolve(directory, path);

  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, bytes);
  manifest.files.push({
    path,
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  });
}
for (const table of backupTables) {
  const rows: unknown[] = [];
  const order =
    table === 'portfolio_releases'
      ? 'generation'
      : table === 'portfolio_revisions'
        ? 'created_at'
        : 'id';

  for (let offset = 0; ; offset += 1000) {
    let query = client.from(table).select('*');

    if (table === 'portfolio_entity_links') query = query.order('source_id').order('target_id');
    else query = query.order(order);
    const { data, error } = await query.range(offset, offset + 999);

    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) break;
  }
  await save(table + '.json', Buffer.from(JSON.stringify(rows)));
}

async function storage(prefix = '') {
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await client.storage
      .from('portfolio-originals')
      .list(prefix, { limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } });

    if (error) throw error;
    for (const item of data) {
      const path = prefix ? prefix + '/' + item.name : item.name;

      if (!/^(?!.*\.\.)[a-zA-Z0-9/_.-]+$/.test(path)) throw new Error('Unexpected original path');
      if (!item.id) await storage(path);
      else {
        const { data: blob, error } = await client.storage
          .from('portfolio-originals')
          .download(path);

        if (error) throw error;
        await save('media/' + path, new Uint8Array(await blob.arrayBuffer()));
      }
    }
    if (data.length < 1000) break;
  }
}
await storage();
for (const file of (await readdir('supabase/migrations'))
  .filter((file) => file.endsWith('.sql'))
  .sort())
  await save('migrations/' + file, await readFile('supabase/migrations/' + file));
await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(manifest, null, 2));
await verifyBackup(directory);
console.log(
  `Verified independent content and original-media backup: ${directory}. Store it encrypted outside the VPS and Supabase.`,
);
