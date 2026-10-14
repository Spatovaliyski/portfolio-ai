import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { supabaseCli } from './supabase-cli.ts';
import { verifyBackup } from './backup-format.ts';
import { contentSchema, githubSchema, entitySchema } from '../src/domain/schema.ts';
import { composeRelease, validatePublication } from '../src/domain/publication.ts';
import { processMedia, storeMedia } from '../src/server/media.ts';
import { checked, rowEntity, type ContentRow } from '../src/server/store.ts';

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
const directory = (await readFile('.cache/live-backup-directory.txt', 'utf8')).trim();

await verifyBackup(directory);
const rows = JSON.parse(
  await readFile(resolve(directory, 'portfolio_entities.json'), 'utf8'),
) as ContentRow[];
const migrated = rows.map(rowEntity);
const prepared = [];

for (const entity of migrated.filter((e) => e.kind === 'media')) {
  const source = resolve('public/media', String(entity.data.path));

  if (
    !source.startsWith(
      resolve('public/media') + '/'.replace('/', process.platform === 'win32' ? '\\' : '/'),
    )
  )
    throw new Error('Unexpected local media path.');
  let bytes: Buffer;
  const remote = await client.storage
    .from('portfolio-originals')
    .download(String(entity.data.path));

  if (remote.data) bytes = Buffer.from(await remote.data.arrayBuffer());
  else bytes = await readFile(source);
  const processed = await processMedia(bytes, String(entity.data.mime), entity.id);

  entity.data = {
    ...entity.data,
    ...processed.entity.data,
    alt: entity.data.alt,
    caption: entity.data.caption,
    rights: entity.data.rights,
    sourceUrl: entity.data.sourceUrl,
  };
  entitySchema.parse(entity);
  prepared.push(processed);
}
if (!process.argv.includes('--apply'))
  throw new Error(
    'Migration requires --apply; create the read-only backup first with scripts/backup-project.ts.',
  );
// Expand before migrating. Idempotent schema application is tracked in Supabase's migration history.
supabaseCli(['db', 'push', '--linked', '--yes']);
if (checked(await client.rpc('portfolio_live_content'))) {
  console.log('A live version already exists. Existing content was preserved; no bootstrap ran.');
  process.exit(0);
}
for (const item of prepared) {
  await storeMedia(client, 'portfolio-originals', [item.originals]);
  await storeMedia(client, 'portfolio-media', item.derivatives);
}
const githubRows = checked(
  await client
    .from('portfolio_github_snapshots')
    .select('payload')
    .order('created_at', { ascending: false })
    .limit(1),
);
let github = githubRows?.[0]?.payload;

if (!github) {
  const response = await fetch('https://spatovaliyski.com/', {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) throw new Error('Existing public snapshot unavailable.');
  const match = (await response.text()).match(
    /<script[^>]*id="portfolio-snapshot"[^>]*>([\s\S]*?)<\/script>/,
  );

  if (!match) throw new Error('Existing public snapshot unavailable.');
  github = contentSchema.parse(JSON.parse(match[1])).github;
}
const base = contentSchema.parse({
  schemaVersion: 1,
  releaseId: 'bootstrap',
  generation: 0,
  generatedAt: new Date().toISOString(),
  github: githubSchema.parse(github),
  entities: [],
});
const snapshot = composeRelease(
  base,
  migrated.map((e) => ({ ...e, status: e.status === 'archived' ? 'archived' : 'published' })),
  randomUUID(),
  1,
  new Date().toISOString(),
);
const errors = validatePublication(snapshot);

if (errors.length) throw new Error(errors.join('\n'));
const payload = JSON.stringify(
  rows.map((old, i) => ({
    old,
    entity: { ...migrated[i], status: old.status === 'archived' ? 'archived' : 'published' },
  })),
);

if (payload.includes('$live_payload$') || JSON.stringify(snapshot).includes('$live_snapshot$'))
  throw new Error('Invalid bootstrap delimiters.');
const sql = `begin; set local lock_timeout='5s'; set local statement_timeout='30s';
do $bootstrap$ declare item jsonb; current_row public.portfolio_entities; revision uuid; release public.portfolio_releases; versions jsonb := '{}';
snapshot jsonb := $live_snapshot$${JSON.stringify(snapshot)}$live_snapshot$::jsonb;
begin
perform 1 from portfolio_private.release_control where singleton for update;
if exists(select 1 from portfolio_private.runtime where enabled) then raise exception 'Runtime already enabled'; end if;
for item in select value from jsonb_array_elements($live_payload$${payload}$live_payload$::jsonb) order by value#>>'{old,id}' loop
  perform pg_advisory_xact_lock(hashtext('portfolio:' || (item#>>'{old,id}')));
  select * into strict current_row from public.portfolio_entities where id=item#>>'{old,id}' for update;
  if current_row.version<>(item#>>'{old,version}')::bigint or current_row.data<>item#>'{old,data}' then raise exception 'Content changed during migration: %',current_row.id; end if;
  update public.portfolio_entities set data=item#>'{entity,data}',status=item#>>'{entity,status}',version=version+1,updated_at=now() where id=current_row.id;
  insert into public.portfolio_revisions(entity_id,version,entity,author) values(current_row.id,current_row.version+1,item->'entity',null) returning id into revision;
  update public.portfolio_entities set current_revision=revision where id=current_row.id;
  versions := jsonb_set(versions,array[current_row.id],to_jsonb(revision::text));
  insert into public.portfolio_audit(action,entity_id) values('live_content_migration',current_row.id);
end loop;
versions := (select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from jsonb_each(versions) where exists(select 1 from jsonb_array_elements(snapshot->'entities') e where e->>'id'=key));
select * into release from public.portfolio_create_release(gen_random_uuid(),null,snapshot,versions,null);
perform public.portfolio_report_deployment(release.id,'runtime-bootstrap','deployed',null);
update portfolio_private.runtime set enabled=true where singleton;
end $bootstrap$; commit;`;

await mkdir('.cache', { recursive: true });
await writeFile('.cache/initialize-live.sql', sql);
supabaseCli(['db', 'query', '--linked', '--file', '.cache/initialize-live.sql']);
const live = contentSchema.parse(checked(await client.rpc('portfolio_live_content')));

console.log(
  `Initialized live Supabase content: ${live.entities.length} public records, ${prepared.length} private originals, version ${live.generation}.`,
);
