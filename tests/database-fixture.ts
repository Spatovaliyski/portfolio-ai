import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';

const owner = '11111111-1111-4111-8111-111111111111';
const stranger = '22222222-2222-4222-8222-222222222222';

export async function portfolioDatabase() {
  const db = new PGlite();

  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key);
    insert into auth.users values('${owner}'),('${stranger}');
    create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql as $$ select jsonb_build_object('aal',current_setting('test.aal',true)) $$;
    grant usage on schema auth to anon,authenticated,service_role; grant execute on all functions in schema auth to anon,authenticated,service_role;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated; grant select,insert on storage.objects to authenticated;`);
  // PGlite omits pg_jsonschema. Structural schemas are checked with Zod and the native
  // local-Supabase CI proof; policy/concurrency tests use its type-compatible stub.
  await db.exec(
    'create schema extensions; create function extensions.jsonb_matches_schema(p_schema json,p_instance jsonb) returns boolean language sql immutable as $$ select true $$;',
  );
  for (const file of (await readdir('supabase/migrations'))
    .filter((file) => file.endsWith('.sql'))
    .sort())
    await db.exec(
      (await readFile('supabase/migrations/' + file, 'utf8')).replace(
        'create extension if not exists pg_jsonschema with schema extensions;',
        '',
      ),
    );

  return db;
}
