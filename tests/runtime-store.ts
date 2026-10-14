import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { portfolioDatabase } from './database-fixture.ts';
import { seedContent } from './fixtures/content.ts';
import { ContentStore, HttpError, type ContentRow } from '../src/server/store.ts';
import { composeRelease, validatePublication } from '../src/domain/publication.ts';
import type { Entity } from '../src/domain/schema.ts';

export async function testStore() {
  const db = await portfolioDatabase();
  const owner = '11111111-1111-4111-8111-111111111111';

  await db.exec(
    `insert into portfolio_private.owner(user_id) values('${owner}'); select set_config('test.uid','${owner}',false); select set_config('test.aal','aal2',false);`,
  );
  const manifest: Record<string, string> = {};

  for (const entity of seedContent.entities)
    manifest[entity.id] = (
      await db.query<{ saved: { revisionId: string } }>(
        'select portfolio_save_entity($1::jsonb,0) as saved',
        [JSON.stringify(entity)],
      )
    ).rows[0].saved.revisionId;
  const snapshot = composeRelease(seedContent, [], randomUUID(), 1, seedContent.generatedAt);
  const release = (
    await db.query<{ id: string }>(
      'select id from portfolio_create_release(gen_random_uuid(),null,$1::jsonb,$2::jsonb)',
      [JSON.stringify(snapshot), JSON.stringify(manifest)],
    )
  ).rows[0];

  await db.query("select portfolio_report_deployment($1,'runtime','deployed',null)", [release.id]);
  await db.exec('update portfolio_private.runtime set enabled=true');
  class IsolatedStore extends ContentStore {
    constructor() {
      super('https://isolated.supabase.co', 'isolated-key');
    }
    override async live() {
      return (
        await db.query<{ content: typeof seedContent }>(
          'select portfolio_live_content() as content',
        )
      ).rows[0].content;
    }
    override async owner(token: string): Promise<SupabaseClient> {
      if (!token) throw new HttpError(401, 'Sign in required.');
      let claims;

      try {
        claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
      } catch {
        throw new HttpError(403, 'Owner MFA required.');
      }
      if (claims.sub !== owner || claims.aal !== 'aal2')
        throw new HttpError(403, 'Owner MFA required.');

      return {} as SupabaseClient;
    }
    override async rows() {
      return (
        await db.query<ContentRow>(
          'select id,kind,status,sort_order,data,version,current_revision from portfolio_entities order by sort_order',
        )
      ).rows;
    }
    override async save(_client: SupabaseClient, entity: Entity, version: number, key: string) {
      const base = await this.live();
      const snapshot = composeRelease(
        base,
        [entity],
        key,
        base.generation + 1,
        new Date().toISOString(),
      );
      const errors = validatePublication(snapshot);

      if (errors.length) throw new HttpError(400, errors.join('\n'));
      const versions = (
        await db.query<{ revision_manifest: Record<string, string> }>(
          'select revision_manifest from portfolio_releases where id=$1',
          [base.releaseId],
        )
      ).rows[0].revision_manifest;

      try {
        return (
          await db.query<{ saved: { version: number; revisionId: string; releaseId: string } }>(
            'select portfolio_save_live($1::jsonb,$2,$3,$4::jsonb,$5::jsonb,$6) as saved',
            [
              JSON.stringify(entity),
              version,
              base.releaseId,
              JSON.stringify(snapshot),
              JSON.stringify(versions),
              key,
            ],
          )
        ).rows[0].saved;
      } catch (e) {
        throw new HttpError(
          /conflict|changed/i.test((e as Error).message) ? 409 : 400,
          (e as Error).message,
        );
      }
    }
  }

  return new IsolatedStore();
}
