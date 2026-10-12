-- Additive portfolio schema. This migration never alters the old site or other projects.
create schema if not exists portfolio_private;
revoke all on schema portfolio_private from public, anon, authenticated;
create table portfolio_private.owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id)
);
create function public.portfolio_is_owner() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from portfolio_private.owner where user_id = auth.uid())
    and coalesce(auth.jwt()->>'aal', '') = 'aal2';
$$;
revoke all on function public.portfolio_is_owner() from public;
grant execute on function public.portfolio_is_owner() to authenticated, service_role;

create table public.portfolio_entities (
  id text primary key check (id ~ '^[a-zA-Z0-9_-]{1,100}$'),
  kind text not null check (kind in ('profile','settings','page','project','experience','qualification','skill','note','media','redirect','repository')),
  status text not null check (status in ('draft','published','archived')),
  sort_order integer not null default 0,
  slug text, classification text, start_date date, end_date date, github_id bigint,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  version bigint not null check (version > 0), current_revision uuid,
  updated_at timestamptz not null default now(),
  check (kind <> 'profile' or id = 'profile'), check (kind <> 'settings' or id = 'settings'),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (slug is null or slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  check (classification is null or classification in ('product','professional','pet-project','archive'))
);
create index portfolio_entities_kind_order on public.portfolio_entities(kind,sort_order);
create table public.portfolio_revisions (
  id uuid primary key default gen_random_uuid(), entity_id text not null references public.portfolio_entities(id),
  version bigint not null, entity jsonb not null, author uuid references auth.users(id), created_at timestamptz not null default now(),
  unique(entity_id,version)
);
alter table public.portfolio_entities add constraint portfolio_current_revision_fk foreign key(current_revision) references public.portfolio_revisions(id);
create table public.portfolio_entity_links (
  source_id text not null references public.portfolio_entities(id), target_id text not null references public.portfolio_entities(id),
  primary key(source_id,target_id)
);
create table public.portfolio_releases (
  id uuid primary key default gen_random_uuid(), generation bigint generated always as identity unique,
  request_key uuid not null unique, base_release_id uuid references public.portfolio_releases(id),
  rollback_of uuid references public.portfolio_releases(id), snapshot jsonb not null,
  revision_manifest jsonb not null, state text not null default 'approved' check (state in ('approved','building','deployed','failed','superseded','invalidated')),
  build_id text, failure text, created_at timestamptz not null default now(), deployed_at timestamptz
);
create table portfolio_private.release_control (
  singleton boolean primary key default true check(singleton), desired_release_id uuid references public.portfolio_releases(id), active_release_id uuid references public.portfolio_releases(id)
);
insert into portfolio_private.release_control(singleton) values(true);
create table public.portfolio_jobs (
  id uuid primary key default gen_random_uuid(), kind text not null, state text not null,
  lock_token uuid, config_release_id uuid references public.portfolio_releases(id), started_at timestamptz not null default now(), finished_at timestamptz, error text
);
create table portfolio_private.job_locks (name text primary key, token uuid not null, expires_at timestamptz not null);
create table public.portfolio_github_snapshots (
  id uuid primary key default gen_random_uuid(), payload jsonb not null, created_at timestamptz not null default now()
);
create table public.portfolio_audit (
  id bigint generated always as identity primary key, actor uuid references auth.users(id), action text not null,
  entity_id text, release_id uuid references public.portfolio_releases(id), created_at timestamptz not null default now()
);
do $$ declare name text; begin
  foreach name in array array['portfolio_entities','portfolio_revisions','portfolio_entity_links','portfolio_releases','portfolio_jobs','portfolio_github_snapshots','portfolio_audit'] loop
    execute format('alter table public.%I enable row level security',name);
    execute format('revoke all on public.%I from anon, authenticated',name);
    execute format('grant select on public.%I to authenticated',name);
    execute format('grant all on public.%I to service_role',name);
    execute format('create policy owner_read on public.%I for select to authenticated using (public.portfolio_is_owner())',name);
  end loop;
end $$;
grant usage,select on all sequences in schema public to service_role;

create function portfolio_private.references(p_data jsonb) returns setof text language sql immutable set search_path='' as $$
  select value from (
    select p_data->>'heroMediaId' as value union all select p_data->>'cvMediaId' union all select p_data->>'projectId' union all select p_data#>>'{seo,imageId}'
    union all select jsonb_array_elements_text(coalesce(p_data->'projectIds','[]'))
    union all select jsonb_array_elements_text(coalesce(p_data->'evidenceIds','[]'))
    union all select b->>'mediaId' from jsonb_array_elements(coalesce(p_data->'blocks','[]')) b
    union all select i->>'mediaId' from jsonb_array_elements(coalesce(p_data->'blocks','[]')) b cross join lateral jsonb_array_elements(coalesce(b->'images','[]')) i
    union all select jsonb_array_elements_text(coalesce(b->'projectIds','[]')) from jsonb_array_elements(coalesce(p_data->'blocks','[]')) b
  ) refs where value is not null and value <> '';
$$;
revoke all on function portfolio_private.references(jsonb) from public,anon,authenticated;

create function public.portfolio_save_entity(p_entity jsonb, p_expected_version bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_old public.portfolio_entities; v_revision uuid; v_version bigint; v_id text := p_entity->>'id'; v_kind text := p_entity->>'kind'; v_data jsonb := p_entity->'data';
begin
  if not public.portfolio_is_owner() then raise exception 'Owner MFA required' using errcode='42501'; end if;
  if jsonb_typeof(v_data) <> 'object' or octet_length(p_entity::text) > 300000 or jsonb_typeof(p_entity->'sortOrder') <> 'number' then raise exception 'Invalid entity'; end if;
  perform pg_advisory_xact_lock(hashtext('portfolio:' || v_id));
  select * into v_old from public.portfolio_entities where id=v_id for update;
  if coalesce(v_old.version,0) <> p_expected_version then raise exception 'Version conflict' using errcode='40001'; end if;
  if v_old.id is not null and v_old.kind <> v_kind then raise exception 'Entity kind is immutable'; end if;
  if v_kind in ('project','note') and (coalesce(v_data->>'title','')='' or coalesce(v_data->>'slug','')='' or jsonb_typeof(v_data->'blocks')<>'array') then raise exception 'Invalid content entity'; end if;
  if v_kind='project' and (coalesce(v_data->>'ownership','')='' or v_data->>'kind' not in ('product','professional','pet-project','archive')) then raise exception 'Project ownership and classification required'; end if;
  if v_kind='repository' and (v_data->>'fullName' !~* '^Spatovaliyski/[a-zA-Z0-9_.-]+$' or (v_data->>'githubId')::bigint <= 0) then raise exception 'Invalid repository'; end if;
  if v_kind='media' and (v_data->>'path' ~ '\.\.' or v_data->>'path' !~* '^[a-zA-Z0-9/_-]+\.(png|jpg|jpeg|webp|avif|pdf)$' or (v_data->>'bytes')::bigint > 20971520) then raise exception 'Invalid media'; end if;
  v_version := coalesce(v_old.version,0)+1;
  insert into public.portfolio_entities(id,kind,status,sort_order,slug,classification,start_date,end_date,github_id,data,version)
    values(v_id,v_kind,p_entity->>'status',(p_entity->>'sortOrder')::integer,v_data->>'slug',case when v_kind='project' then v_data->>'kind' end,case when v_kind='experience' then (v_data->>'start')::date end,case when v_kind='experience' then (v_data->>'end')::date end,case when v_kind='repository' then (v_data->>'githubId')::bigint end,v_data,v_version)
    on conflict(id) do update set status=excluded.status,sort_order=excluded.sort_order,slug=excluded.slug,classification=excluded.classification,start_date=excluded.start_date,end_date=excluded.end_date,github_id=excluded.github_id,data=excluded.data,version=excluded.version,updated_at=now();
  insert into public.portfolio_revisions(entity_id,version,entity,author) values(v_id,v_version,p_entity,auth.uid()) returning id into v_revision;
  update public.portfolio_entities set current_revision=v_revision where id=v_id;
  delete from public.portfolio_entity_links where source_id is not null;
  insert into public.portfolio_entity_links(source_id,target_id)
    select distinct e.id, r.target from public.portfolio_entities e cross join lateral portfolio_private.references(e.data) r(target)
    join public.portfolio_entities t on t.id=r.target where e.status <> 'archived';
  insert into public.portfolio_audit(actor,action,entity_id) values(auth.uid(),'save',v_id);
  return jsonb_build_object('version',v_version,'revisionId',v_revision);
end $$;
revoke all on function public.portfolio_save_entity(jsonb,bigint) from public;
grant execute on function public.portfolio_save_entity(jsonb,bigint) to authenticated;

create function public.portfolio_create_release(p_request_key uuid,p_base uuid,p_snapshot jsonb,p_manifest jsonb,p_rollback uuid default null) returns public.portfolio_releases
language plpgsql security definer set search_path = '' as $$
declare v_control portfolio_private.release_control; v_release public.portfolio_releases;
begin
  select * into v_control from portfolio_private.release_control where singleton for update;
  select * into v_release from public.portfolio_releases where request_key=p_request_key;
  if found then return v_release; end if;
  if v_control.desired_release_id is distinct from p_base then raise exception 'Release base conflict' using errcode='40001'; end if;
  insert into public.portfolio_releases(request_key,base_release_id,snapshot,revision_manifest,rollback_of) values(p_request_key,p_base,p_snapshot,p_manifest,p_rollback) returning * into v_release;
  update public.portfolio_releases set snapshot=jsonb_set(jsonb_set(snapshot,'{releaseId}',to_jsonb(v_release.id::text)),'{generation}',to_jsonb(v_release.generation)) where id=v_release.id returning * into v_release;
  update portfolio_private.release_control set desired_release_id=v_release.id where singleton;
  insert into public.portfolio_audit(action,release_id) values(case when p_rollback is null then 'approve' else 'rollback' end,v_release.id);
  return v_release;
end $$;
create function public.portfolio_release_status() returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object('desiredReleaseId',desired_release_id,'activeReleaseId',active_release_id) from portfolio_private.release_control where singleton;
$$;
create function public.portfolio_report_deployment(p_id uuid,p_build text,p_state text,p_error text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_release public.portfolio_releases; v_current public.portfolio_releases; v_control portfolio_private.release_control;
begin
  if p_state not in ('building','deployed','failed') then raise exception 'Invalid state'; end if;
  select * into v_control from portfolio_private.release_control where singleton for update;
  select * into strict v_release from public.portfolio_releases where id=p_id for update;
  if v_release.state in ('invalidated','superseded') then raise exception 'Release is no longer deployable'; end if;
  if v_release.state='deployed' then return jsonb_build_object('state','deployed'); end if;
  if p_state in ('building','deployed') and v_control.desired_release_id is distinct from p_id then raise exception 'Release is no longer desired'; end if;
  if p_state='deployed' then
    select * into v_current from public.portfolio_releases where id=v_control.active_release_id;
    if v_current.generation is not null and v_current.generation >= v_release.generation then raise exception 'Older deployment rejected'; end if;
    update portfolio_private.release_control set active_release_id=p_id where singleton;
  end if;
  update public.portfolio_releases set state=p_state,build_id=p_build,failure=left(p_error,1000),deployed_at=case when p_state='deployed' then now() else deployed_at end where id=p_id;
  insert into public.portfolio_audit(action,release_id) values(p_state,p_id);
  return jsonb_build_object('state',p_state);
end $$;
create function public.portfolio_acquire_lock(p_name text,p_token uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
  update public.portfolio_jobs set state='failed',finished_at=now(),error='Synchronization lease expired'
    where kind='github' and state='running' and started_at < now()-interval '15 minutes';
  insert into portfolio_private.job_locks(name,token,expires_at) values(p_name,p_token,now()+interval '15 minutes')
  on conflict(name) do update set token=excluded.token,expires_at=excluded.expires_at where portfolio_private.job_locks.expires_at < now();
  return found;
end $$;
create function public.portfolio_release_lock(p_name text,p_token uuid) returns void language sql security definer set search_path='' as $$ delete from portfolio_private.job_locks where name=p_name and token=p_token; $$;
revoke all on function public.portfolio_create_release(uuid,uuid,jsonb,jsonb,uuid),public.portfolio_release_status(),public.portfolio_report_deployment(uuid,text,text,text),public.portfolio_acquire_lock(text,uuid),public.portfolio_release_lock(text,uuid) from public,anon,authenticated;
grant execute on function public.portfolio_create_release(uuid,uuid,jsonb,jsonb,uuid),public.portfolio_release_status(),public.portfolio_report_deployment(uuid,text,text,text),public.portfolio_acquire_lock(text,uuid),public.portfolio_release_lock(text,uuid) to service_role;

-- Commit a provider result, privacy invalidation and replacement release together.
create function public.portfolio_finish_sync(p_token uuid,p_job uuid,p_snapshot jsonb,p_expected_desired uuid,p_refresh_snapshot jsonb,p_manifest jsonb,p_error text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_control portfolio_private.release_control; v_release public.portfolio_releases;
begin
  select * into v_control from portfolio_private.release_control where singleton for update;
  if not exists(select 1 from portfolio_private.job_locks where name='github' and token=p_token and expires_at>now())
    or not exists(select 1 from public.portfolio_jobs where id=p_job and lock_token=p_token and state='running') then raise exception 'Synchronization lease is invalid'; end if;
  if p_error is not null then
    update public.portfolio_jobs set state='failed',error=left(p_error,1000),finished_at=now() where id=p_job;
    perform public.portfolio_release_lock('github',p_token); return jsonb_build_object('refreshed',false);
  end if;
  if v_control.desired_release_id is distinct from p_expected_desired then raise exception 'Release base conflict' using errcode='40001'; end if;
  insert into public.portfolio_github_snapshots(payload) values(p_snapshot);
  update public.portfolio_jobs set state=case when jsonb_array_length(p_snapshot->'errors')>0 then 'partial' else 'complete' end,
    finished_at=now(),error=left((p_snapshot->'errors')::text,1000) where id=p_job;
  update public.portfolio_releases r set state='invalidated' where r.state <> 'invalidated' and exists (
    select 1 from jsonb_array_elements_text(p_snapshot->'excludedIds') x(id) where
      exists(select 1 from jsonb_array_elements(r.snapshot#>'{github,repositories}') repo where repo->>'id'=x.id)
      or exists(select 1 from jsonb_array_elements(r.snapshot->'entities') e where e->>'kind'='repository' and e#>>'{data,githubId}'=x.id
        or exists(select 1 from jsonb_array_elements_text(coalesce(e#>'{data,repositoryIds}','[]')) ids where ids=x.id))
  );
  if p_refresh_snapshot is not null then
    select * into v_release from public.portfolio_create_release(gen_random_uuid(),p_expected_desired,p_refresh_snapshot,p_manifest,null);
  end if;
  perform public.portfolio_release_lock('github',p_token);
  return jsonb_build_object('refreshed',v_release.id is not null,'releaseId',v_release.id);
end $$;
revoke all on function public.portfolio_finish_sync(uuid,uuid,jsonb,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.portfolio_finish_sync(uuid,uuid,jsonb,uuid,jsonb,jsonb,text) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('portfolio-originals','portfolio-originals',false,20971520,array['image/png','image/jpeg','image/webp','image/avif','application/pdf']);
create policy portfolio_original_read on storage.objects for select to authenticated using(bucket_id='portfolio-originals' and public.portfolio_is_owner());
create policy portfolio_original_insert on storage.objects for insert to authenticated with check(bucket_id='portfolio-originals' and public.portfolio_is_owner());
-- No update/delete policy: old originals remain available for revisions and recovery.
