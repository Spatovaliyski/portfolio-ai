import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { portfolioDatabase } from './database-fixture.ts';
import { seedContent } from './fixtures/content.ts';
import { composeRelease } from '../src/domain/publication.ts';
import { processMedia } from '../src/server/media.ts';
import sharp from 'sharp';

let db: PGlite;
let base: typeof seedContent;
let manifest: Record<string, string>;
const owner = '11111111-1111-4111-8111-111111111111';

beforeAll(async () => {
  db = await portfolioDatabase();
  await db.exec(
    `insert into portfolio_private.owner(user_id) values('${owner}'); select set_config('test.uid','${owner}',false); select set_config('test.aal','aal2',false);`,
  );
  manifest = {};
  for (const entity of seedContent.entities) {
    const result = (
      await db.query<{ saved: { revisionId: string } }>(
        'select portfolio_save_entity($1::jsonb,0) as saved',
        [JSON.stringify(entity)],
      )
    ).rows[0].saved;

    manifest[entity.id] = result.revisionId;
  }
  const snapshot = composeRelease(seedContent, [], 'initial', 1, seedContent.generatedAt);
  const release = (
    await db.query<{ id: string }>(
      'select id from portfolio_create_release(gen_random_uuid(),null,$1::jsonb,$2::jsonb)',
      [JSON.stringify(snapshot), JSON.stringify(manifest)],
    )
  ).rows[0];

  await db.query("select portfolio_report_deployment($1,'runtime','deployed',null)", [release.id]);
  await db.exec('update portfolio_private.runtime set enabled=true');
  base = (
    await db.query<{ content: typeof seedContent }>('select portfolio_live_content() as content')
  ).rows[0].content;
}, 30000);
afterAll(async () => {
  await db.close();
});

describe('immediate live saves', () => {
  it('atomically updates the record, revision, and public version; retry is idempotent', async () => {
    await db.exec('set role authenticated');
    const entity = structuredClone(base.entities.find((e) => e.id === 'crownpeak')!);

    entity.data.summary = 'A live edit without a build.';
    const snapshot = composeRelease(base, [entity], 'next', 2, new Date().toISOString());
    const key = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const params = [
      JSON.stringify(entity),
      base.releaseId,
      JSON.stringify(snapshot),
      JSON.stringify(manifest),
      key,
    ];
    const call = () =>
      db.query<{ saved: { version: number; releaseId: string } }>(
        'select portfolio_save_live($1::jsonb,1,$2,$3::jsonb,$4::jsonb,$5) as saved',
        params,
      );
    const saved = (await call()).rows[0].saved;

    expect(saved.version).toBe(2);
    expect((await call()).rows[0].saved).toEqual(saved);
    await db.exec('reset role');
    const current = (
      await db.query<{ content: typeof seedContent }>('select portfolio_live_content() as content')
    ).rows[0].content;

    expect(current.releaseId).toBe(saved.releaseId);
    expect(current.entities.find((e) => e.id === 'crownpeak')?.data.summary).toBe(
      entity.data.summary,
    );
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::int as n from portfolio_revisions where entity_id='crownpeak'",
        )
      ).rows[0].n,
    ).toBe(2);
  });
  it('rejects stale writes, unauthorized saves, and the old draft-write path', async () => {
    const entity = structuredClone(base.entities.find((e) => e.id === 'crownpeak')!);

    await db.exec('set role authenticated');
    await expect(
      db.query('select portfolio_save_entity($1::jsonb,2)', [JSON.stringify(entity)]),
    ).rejects.toThrow('upgraded');
    await expect(
      db.query('select portfolio_save_live($1::jsonb,1,$2,$3::jsonb,$4::jsonb,gen_random_uuid())', [
        JSON.stringify(entity),
        base.releaseId,
        JSON.stringify(base),
        JSON.stringify(manifest),
      ]),
    ).rejects.toThrow('Content changed');
    await db.exec("select set_config('test.aal','aal1',false)");
    await expect(
      db.query('select portfolio_save_live($1::jsonb,2,$2,$3::jsonb,$4::jsonb,gen_random_uuid())', [
        JSON.stringify(entity),
        base.releaseId,
        JSON.stringify(base),
        JSON.stringify(manifest),
      ]),
    ).rejects.toThrow('Owner MFA');
    await db.exec('reset role; set role anon');
    await expect(db.query('select portfolio_live_content()')).rejects.toThrow('permission denied');
    await db.exec('reset role');
  });
});
it('validates image bytes and generates immutable responsive derivatives', async () => {
  const bytes = await sharp({
    create: { width: 1400, height: 700, channels: 3, background: '#2445e8' },
  })
    .png()
    .toBuffer();
  const result = await processMedia(bytes, 'image/png', 'test-image');

  expect(result.entity.data.width).toBe(1400);
  expect(result.derivatives).toHaveLength(3);
  expect(result.entity.data.publicPath).toMatch(/^\/media\/[a-f0-9]+-1200.webp$/);
  await expect(processMedia(bytes, 'image/jpeg')).rejects.toThrow('does not match');
  await expect(processMedia(Buffer.from('not an image'), 'image/png')).rejects.toMatchObject({
    status: 400,
  });
  await expect(processMedia(Buffer.from('not a pdf'), 'application/pdf')).rejects.toThrow(
    'Invalid PDF',
  );
});
