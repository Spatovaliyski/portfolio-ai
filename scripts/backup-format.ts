import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

export const backupTables = [
  'portfolio_entities',
  'portfolio_revisions',
  'portfolio_entity_links',
  'portfolio_releases',
  'portfolio_jobs',
  'portfolio_github_snapshots',
  'portfolio_audit',
] as const;

export type BackupManifest = {
  schemaVersion: 1;
  createdAt: string;
  project: string;
  ownerId: string;
  control: { desiredReleaseId: string | null; activeReleaseId: string | null };
  files: Array<{ path: string; bytes: number; sha256: string }>;
};

export async function verifyBackup(directory: string) {
  const manifest = JSON.parse(
    await readFile(resolve(directory, 'manifest.json'), 'utf8'),
  ) as BackupManifest;

  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.files) || !manifest.ownerId)
    throw new Error('Unsupported backup');
  if (backupTables.some((table) => !manifest.files.some((file) => file.path === table + '.json')))
    throw new Error('Backup table is missing');
  for (const item of manifest.files) {
    if (!/^(?!.*\.\.)[a-zA-Z0-9/_.,-]+$/.test(item.path)) throw new Error('Invalid backup path');
    const bytes = await readFile(resolve(directory, item.path));

    if (
      bytes.length !== item.bytes ||
      createHash('sha256').update(bytes).digest('hex') !== item.sha256
    )
      throw new Error(`Backup checksum mismatch: ${item.path}`);
  }

  return manifest;
}
const quote = (value: unknown) =>
  value === null || value === undefined
    ? 'null'
    : typeof value === 'number'
      ? String(value)
      : typeof value === 'boolean'
        ? value
          ? 'true'
          : 'false'
        : `'${(typeof value === 'object' ? JSON.stringify(value) : String(value)).replaceAll("'", "''")}'`;

export function restoreSql(
  tables: Record<string, Array<Record<string, unknown>>>,
  manifest: BackupManifest,
  ownerId: string,
): string {
  if (!/^[a-f0-9-]{36}$/.test(ownerId)) throw new Error('Trusted target owner UUID required');
  const statements = [
    'begin;',
    "do $$ begin if exists(select 1 from public.portfolio_entities) or exists(select 1 from public.portfolio_releases) then raise exception 'Restore target must be empty'; end if; end $$;",
  ];

  statements.push(`insert into portfolio_private.owner(user_id) values(${quote(ownerId)});`);
  for (const table of backupTables)
    for (const input of tables[table] ?? []) {
      const row = { ...input };

      if (table === 'portfolio_entities') row.current_revision = null;
      if ('author' in row && row.author) row.author = ownerId;
      if ('actor' in row && row.actor) row.actor = ownerId;
      const columns = Object.keys(row);

      if (columns.some((column) => !/^\w+$/.test(column))) throw new Error('Invalid backup column');
      statements.push(
        `insert into public.${table}(${columns.map((c) => '"' + c + '"').join(',')}) overriding system value values(${columns.map((c) => quote(row[c])).join(',')});`,
      );
    }
  for (const row of tables.portfolio_entities ?? [])
    statements.push(
      `update public.portfolio_entities set current_revision=${quote(row.current_revision)} where id=${quote(row.id)};`,
    );
  statements.push(
    `update portfolio_private.release_control set desired_release_id=${quote(manifest.control.desiredReleaseId)},active_release_id=${quote(manifest.control.activeReleaseId)} where singleton;`,
  );
  statements.push(
    "select setval(pg_get_serial_sequence('public.portfolio_releases','generation'),coalesce((select max(generation) from public.portfolio_releases),1),exists(select 1 from public.portfolio_releases));",
  );
  statements.push(
    "select setval(pg_get_serial_sequence('public.portfolio_audit','id'),coalesce((select max(id) from public.portfolio_audit),1),exists(select 1 from public.portfolio_audit));",
    'commit;',
  );

  return statements.join('\n');
}
