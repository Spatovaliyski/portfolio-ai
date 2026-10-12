import { expect, it } from 'vitest';
import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
import { portfolioDatabase } from './database-fixture.ts';
import {
  backupTables,
  verifyBackup,
  restoreSql,
  type BackupManifest,
} from '../scripts/backup-format.ts';
import { seedContent } from '../src/content/seed.ts';

it('restores actual revisions, release generations and originals and detects corruption', async () => {
  const db = await portfolioDatabase();
  const restored = await portfolioDatabase();

  await mkdir('.cache', { recursive: true });
  const directory = await mkdtemp(resolve('.cache', 'restore-proof-'));

  try {
    const owner = '11111111-1111-4111-8111-111111111111';

    await db.exec(
      `insert into portfolio_private.owner(user_id) values('${owner}'); select set_config('test.uid','${owner}',false);select set_config('test.aal','aal2',false);set role authenticated;`,
    );
    await db.query('select public.portfolio_save_entity($1::jsonb,0)', [
      JSON.stringify(seedContent.entities[0]),
    ]);
    await db.exec('reset role');
    const release = (
      await db.query<{ id: string }>(
        "select id from public.portfolio_create_release(gen_random_uuid(),null,$1::jsonb,'{}',null)",
        [JSON.stringify(seedContent)],
      )
    ).rows[0];

    await db.query("select public.portfolio_report_deployment($1,'proof','deployed')", [
      release.id,
    ]);
    const manifest: BackupManifest = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      project: 'isolated-test',
      ownerId: owner,
      control: { desiredReleaseId: release.id, activeReleaseId: release.id },
      files: [],
    };
    const tables: Record<string, Array<Record<string, unknown>>> = {};
    const save = async (path: string, bytes: Buffer) => {
      await writeFile(resolve(directory, path), bytes);
      manifest.files.push({
        path,
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    };

    for (const table of backupTables) {
      tables[table] = (
        await db.query<Record<string, unknown>>(`select * from public.${table}`)
      ).rows;
      await save(table + '.json', Buffer.from(JSON.stringify(tables[table])));
    }
    await mkdir(resolve(directory, 'media'));
    await save('media/original.pdf', Buffer.from('%PDF-proof-original'));
    await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(manifest));
    await verifyBackup(directory);
    await restored.exec(restoreSql(tables, manifest, owner));
    expect((await restored.query('select version from public.portfolio_entities')).rows).toEqual([
      { version: 1 },
    ]);
    expect(
      (await restored.query('select id,generation,state from public.portfolio_releases')).rows,
    ).toEqual([{ id: release.id, generation: 1, state: 'deployed' }]);
    expect(
      (await restored.query('select entity_id,version from public.portfolio_revisions')).rows,
    ).toEqual([{ entity_id: 'profile', version: 1 }]);
    await writeFile(resolve(directory, 'media/original.pdf'), 'corrupted');
    await expect(verifyBackup(directory)).rejects.toThrow('checksum mismatch');
  } finally {
    await db.close();
    await restored.close();
    // Only clean up the isolated directory this test created inside its workspace.
    if (dirname(directory) === resolve('.cache')) {
      await rm(directory, { recursive: true, force: true });
    }
  }
}, 30000);
