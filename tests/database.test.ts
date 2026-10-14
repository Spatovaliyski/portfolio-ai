import { PGlite } from '@electric-sql/pglite';
import { portfolioDatabase } from './database-fixture.ts';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { seedContent } from './fixtures/content.ts';
import { purgeRepositories } from '../src/domain/privacy.ts';

let db: PGlite;
const owner = '11111111-1111-4111-8111-111111111111';
const stranger = '22222222-2222-4222-8222-222222222222';

async function identity(role: string, id = owner, aal = 'aal2') {
  await db.exec(
    `reset role; select set_config('test.uid','${id}',false); select set_config('test.aal','${aal}',false); set role ${role};`,
  );
}
const save = (entity: unknown, version: number) =>
  db.query<{ result: { version: number; revisionId: string } }>(
    'select public.portfolio_save_entity($1::jsonb,$2::bigint) as result',
    [JSON.stringify(entity), version],
  );

beforeAll(async () => {
  db = await portfolioDatabase();
  await db.exec(`insert into portfolio_private.owner(user_id) values('${owner}')`);
}, 30000);
afterAll(async () => {
  await db.close();
});
describe('actual owner and MFA policies', () => {
  it('denies anonymous, unrelated accounts and owner without MFA', async () => {
    await identity('anon');
    await expect(db.query('select * from public.portfolio_entities')).rejects.toThrow(
      /permission denied/,
    );
    await identity('authenticated', stranger);
    expect((await db.query('select * from public.portfolio_entities')).rows).toEqual([]);
    await expect(save(seedContent.entities[0], 0)).rejects.toThrow('Owner MFA required');
    await identity('authenticated', owner, 'aal1');
    await expect(save(seedContent.entities[0], 0)).rejects.toThrow('Owner MFA required');
    await expect(
      db.query("insert into storage.objects(bucket_id,name) values('portfolio-originals','x.jpg')"),
    ).rejects.toThrow(/row-level security/);
  });
  it('appends revisions transactionally and returns a recoverable two-tab conflict', async () => {
    await identity('authenticated');
    const result = await save(seedContent.entities[0], 0);

    expect(result.rows[0].result.version).toBe(1);
    await expect(save(seedContent.entities[0], 0)).rejects.toThrow('Version conflict');
    await save(seedContent.entities[0], 1);
    expect(
      (await db.query('select version from public.portfolio_revisions order by version')).rows,
    ).toEqual([{ version: 1 }, { version: 2 }]);
    await db.query(
      "insert into storage.objects(bucket_id,name) values('portfolio-originals','x.jpg')",
    );
    await expect(db.query('delete from storage.objects')).rejects.toThrow(/permission denied/);
  });
  it('rejects raw HTML and executable URLs even through the direct owner RPC', async () => {
    await identity('authenticated');
    const entity = structuredClone(seedContent.entities.find((e) => e.id === 'bausy')!);

    entity.data.blocks = [{ id: 'unsafe', type: 'prose', markdown: '<script>attack()</script>' }];
    await expect(save(entity, 0)).rejects.toThrow('Raw HTML');
    entity.data.blocks = [];
    entity.data.links = [{ label: 'Unsafe', url: 'javascript:attack()' }];
    await expect(save(entity, 0)).rejects.toThrow('Unsafe content URL');
    expect(
      (await db.query("select id from public.portfolio_entities where id='bausy'")).rows,
    ).toEqual([]);
  });
});
describe('release generations and callbacks', () => {
  const create = (key: string, base: string | null, rollback: string | null = null) =>
    db.query<{ id: string; generation: number }>(
      'select id,generation from public.portfolio_create_release($1,$2,$3::jsonb,$4::jsonb,$5)',
      [key, base, JSON.stringify(seedContent), '{}', rollback],
    );

  it('handles repeated requests, delayed callbacks, rollback and out-of-order jobs', async () => {
    await identity('service_role');
    const a = (await create('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', null)).rows[0];
    const repeated = (await create('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', null)).rows[0];

    expect(repeated.id).toBe(a.id);
    await db.query("select public.portfolio_report_deployment($1,'a','deployed')", [a.id]);
    const b = (await create('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', a.id)).rows[0];
    const c = (await create('cccccccc-cccc-4ccc-8ccc-cccccccccccc', b.id, a.id)).rows[0];

    expect(c.generation).toBeGreaterThan(b.generation);
    await db.query("select public.portfolio_report_deployment($1,'c','deployed')", [c.id]);
    await expect(
      db.query("select public.portfolio_report_deployment($1,'b','deployed')", [b.id]),
    ).rejects.toThrow(/Older|desired/);
    await db.query("select public.portfolio_report_deployment($1,'a','deployed')", [a.id]);
    const control = (
      await db.query<{ result: { activeReleaseId: string } }>(
        'select public.portfolio_release_status() as result',
      )
    ).rows[0].result;

    expect(control.activeReleaseId).toBe(c.id);
  });
  it('rejects forged synchronization leases and releases a valid failed job', async () => {
    await identity('service_role');
    const token = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

    await db.query("select public.portfolio_acquire_lock('github',$1)", [token]);
    const job = (
      await db.query<{ id: string }>(
        "insert into public.portfolio_jobs(kind,state,lock_token) values('github','running',$1) returning id",
        [token],
      )
    ).rows[0].id;

    await expect(
      db.query("select public.portfolio_finish_sync($1,$2,null,null,null,'{}','outage')", [
        owner,
        job,
      ]),
    ).rejects.toThrow('lease is invalid');
    await db.query("select public.portfolio_finish_sync($1,$2,null,null,null,'{}','outage')", [
      token,
      job,
    ]);
    expect(
      (await db.query('select state from public.portfolio_jobs where id=$1', [job])).rows,
    ).toEqual([{ state: 'failed' }]);
    expect(
      (await db.query("select public.portfolio_acquire_lock('github',$1) as acquired", [owner]))
        .rows,
    ).toEqual([{ acquired: true }]);
    await db.query("select public.portfolio_release_lock('github',$1)", [owner]);
  });
  it('invalidates retained releases and creates a privacy replacement even with a newer desired build', async () => {
    await identity('service_role');
    const status = (
      await db.query<{ result: { desiredReleaseId: string; activeReleaseId: string } }>(
        'select public.portfolio_release_status() as result',
      )
    ).rows[0].result;
    const pending = (await create('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', status.desiredReleaseId))
      .rows[0];
    const token = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

    await db.query("select public.portfolio_acquire_lock('github',$1)", [token]);
    const job = (
      await db.query<{ id: string }>(
        "insert into public.portfolio_jobs(kind,state,lock_token) values('github','running',$1) returning id",
        [token],
      )
    ).rows[0].id;
    const excluded = Number(
      seedContent.entities.find((e) => e.id === 'repo-platesct')!.data.githubId,
    );
    const next = purgeRepositories(seedContent, [excluded]);
    const result = (
      await db.query<{ result: { releaseId: string; refreshed: boolean } }>(
        "select public.portfolio_finish_sync($1,$2,$3::jsonb,$4,$5::jsonb,'{}') as result",
        [token, job, JSON.stringify(next.github), pending.id, JSON.stringify(next)],
      )
    ).rows[0].result;

    expect(result.refreshed).toBe(true);
    expect(
      (await db.query('select state from public.portfolio_releases where id=$1', [pending.id]))
        .rows,
    ).toEqual([{ state: 'invalidated' }]);
    await expect(
      db.query("select public.portfolio_report_deployment($1,'pending','deployed')", [pending.id]),
    ).rejects.toThrow('no longer deployable');
    await expect(
      db.query("select public.portfolio_finish_sync($1,$2,$3::jsonb,$4,$5::jsonb,'{}')", [
        token,
        job,
        JSON.stringify(next.github),
        pending.id,
        JSON.stringify(next),
      ]),
    ).rejects.toThrow('lease is invalid');
  });
  it('invalidates retained releases immediately when the owner publishes a curation removal', async () => {
    await identity('service_role');
    const base = (
      await db.query<{ result: { desiredReleaseId: string } }>(
        'select public.portfolio_release_status() as result',
      )
    ).rows[0].result.desiredReleaseId;
    const retained = (
      await db.query<{ snapshot: typeof seedContent }>(
        'select snapshot from public.portfolio_releases where id=$1',
        [base],
      )
    ).rows[0].snapshot;
    const repository = retained.entities.find((entity) => entity.kind === 'repository')!;
    const next = purgeRepositories(retained, [Number(repository.data.githubId)]);
    const published = (
      await db.query<{ id: string; state: string }>(
        "select id,state from public.portfolio_create_release($1,$2,$3::jsonb,'{}')",
        ['99999999-9999-4999-8999-999999999999', base, JSON.stringify(next)],
      )
    ).rows[0];

    expect(published.state).toBe('approved');
    expect(
      (await db.query('select state from public.portfolio_releases where id=$1', [base])).rows,
    ).toEqual([{ state: 'invalidated' }]);
    await expect(
      db.query("select public.portfolio_report_deployment($1,'removed','deployed')", [base]),
    ).rejects.toThrow('no longer deployable');
    expect(
      (
        await db.query<{ result: { desiredReleaseId: string } }>(
          'select public.portfolio_release_status() as result',
        )
      ).rows[0].result.desiredReleaseId,
    ).toBe(published.id);
  });
});
