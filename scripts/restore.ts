import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { supabaseCli } from './supabase-cli.ts';
import { createClient } from '@supabase/supabase-js';
import { backupTables, verifyBackup, restoreSql } from './backup-format.ts';

const directory = process.argv.find((arg) => arg.startsWith('--backup='))?.slice(9);

if (!directory) throw new Error('Provide --backup=<private backup directory>');
const manifest = await verifyBackup(directory);

if (process.argv.includes('--verify')) {
  console.log(`Verified ${manifest.files.length} backup files and original-media checksums.`);
  process.exit(0);
}
const project = process.env.PORTFOLIO_RESTORE_PROJECT_REF;

if (!project || project === 'lmxukzcvxhpbwtgsbrai' || !/^[a-z]{20}$/.test(project))
  throw new Error('Restoration requires a separate empty development project, never production.');
if ((await readFile('supabase/.temp/project-ref', 'utf8')).trim() !== project)
  throw new Error('CLI must be linked to the isolated restore project.');
const owner = process.env.PORTFOLIO_RESTORE_OWNER_UUID!;
const secret = process.env.PORTFOLIO_RESTORE_SECRET;

if (!secret) throw new Error('Trusted target-project secret required through the environment.');
const tables: Record<string, Array<Record<string, unknown>>> = {};

for (const table of backupTables)
  tables[table] = JSON.parse(await readFile(resolve(directory, table + '.json'), 'utf8'));
const sql = restoreSql(tables, manifest, owner);

await mkdir('.cache', { recursive: true });
await writeFile('.cache/restore.sql', sql);
// Apply the matching versioned schema first; create the target auth owner through trusted setup.
supabaseCli(['db', 'query', '--linked', '--file', '.cache/restore.sql']);
const client = createClient(`https://${project}.supabase.co`, secret, {
  auth: { persistSession: false },
});

for (const item of manifest.files.filter((file) => file.path.startsWith('media/'))) {
  const path = item.path.slice(6);
  const bytes = await readFile(resolve(directory, item.path));
  const old = await client.storage.from('portfolio-originals').download(path);

  if (old.data) {
    if (!bytes.equals(Buffer.from(await old.data.arrayBuffer())))
      throw new Error('Restore original collision');
  } else {
    const { error } = await client.storage
      .from('portfolio-originals')
      .upload(path, bytes, { upsert: false });

    if (error) throw error;
  }
}
console.log(
  'Content and originals restored into isolated development. Verify editor/release counts and a generated release before accepting the rehearsal. Relink the CLI to Portfolio afterward.',
);
