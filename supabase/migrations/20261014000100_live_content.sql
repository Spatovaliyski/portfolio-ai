-- Expand: keep historical releases and originals; add immediate owner saves.
create table portfolio_private.runtime (
  singleton boolean primary key default true check(singleton),
  enabled boolean not null default false
);
insert into portfolio_private.runtime(singleton) values(true);
revoke all on portfolio_private.runtime from public,anon,authenticated;

create function public.portfolio_live_content() returns jsonb
language sql stable security definer set search_path='' as $$
  select r.snapshot from portfolio_private.release_control c
  join public.portfolio_releases r on r.id=c.active_release_id
  where c.singleton and r.state='deployed';
$$;
revoke all on function public.portfolio_live_content() from public,anon,authenticated;
grant execute on function public.portfolio_live_content() to service_role;

create function public.portfolio_save_live(
  p_entity jsonb,p_expected_version bigint,p_base uuid,p_snapshot jsonb,
  p_manifest jsonb,p_request_key uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved jsonb; published public.portfolio_releases; prior public.portfolio_revisions;
begin
  if not public.portfolio_is_owner() then raise exception 'Owner MFA required' using errcode='42501'; end if;
  select * into published from public.portfolio_releases where request_key=p_request_key;
  if found then
    select * into strict prior from public.portfolio_revisions
      where entity_id=p_entity->>'id' and version=p_expected_version+1;
    if prior.entity <> p_entity or prior.version <> p_expected_version+1 then raise exception 'Request key reused for different content'; end if;
    return jsonb_build_object('version',prior.version,'revisionId',prior.id,'releaseId',published.id);
  end if;
  perform 1 from portfolio_private.release_control where singleton for update;
  if (select active_release_id from portfolio_private.release_control where singleton) is distinct from p_base then
    raise exception 'Content changed while saving. Retry after refreshing.' using errcode='40001';
  end if;
  if not exists(select 1 from portfolio_private.runtime where singleton and enabled) then raise exception 'Live editor is not initialized'; end if;
  perform set_config('portfolio.live_write','yes',true);
  saved := public.portfolio_save_entity(p_entity,p_expected_version);
  if p_entity->>'status'='archived' then p_manifest := p_manifest-(p_entity->>'id');
  else p_manifest := jsonb_set(p_manifest,array[p_entity->>'id'],saved->'revisionId'); end if;
  if jsonb_array_length(p_snapshot->'entities') > 1000 or octet_length(p_snapshot::text)>6000000 then raise exception 'Invalid snapshot'; end if;
  if exists(select 1 from jsonb_array_elements(p_snapshot->'entities') e
    left join public.portfolio_revisions r on r.id=(p_manifest->>(e->>'id'))::uuid
    where e->>'status'<>'published' or r.id is null or (r.entity<>e and not exists(select 1 from public.portfolio_releases old, lateral jsonb_array_elements(old.snapshot->'entities') previous where old.id=p_base and previous=e))) then raise exception 'Snapshot does not match saved revisions'; end if;
  select * into published from public.portfolio_create_release(p_request_key,p_base,p_snapshot,p_manifest,null);
  perform public.portfolio_report_deployment(published.id,'runtime','deployed',null);
  return saved || jsonb_build_object('releaseId',published.id);
end $$;
revoke all on function public.portfolio_save_live(jsonb,bigint,uuid,jsonb,jsonb,uuid) from public,anon;
grant execute on function public.portfolio_save_live(jsonb,bigint,uuid,jsonb,jsonb,uuid) to authenticated;

-- Reject old dashboard draft writes once the runtime has been initialized.
create function portfolio_private.live_write_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from portfolio_private.runtime where enabled) and current_setting('portfolio.live_write',true) is distinct from 'yes' then
    raise exception 'This editor has been upgraded. Refresh the dashboard before saving.';
  end if;
  return new;
end $$;
create trigger portfolio_live_write_guard before insert or update of status,data on public.portfolio_entities
for each row execute function portfolio_private.live_write_guard();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('portfolio-media','portfolio-media',true,20971520,array['image/webp','application/pdf'])
on conflict(id) do nothing;
-- Only trusted processing writes derivatives; owner uploads continue to use private originals.
create policy portfolio_derivative_owner_read on storage.objects for select to authenticated
using(bucket_id='portfolio-media' and public.portfolio_is_owner());

create function public.portfolio_finish_live_sync(
 p_token uuid,p_job uuid,p_snapshot jsonb,p_expected_desired uuid,p_refresh_snapshot jsonb,p_manifest jsonb,p_error text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result := public.portfolio_finish_sync(p_token,p_job,p_snapshot,p_expected_desired,p_refresh_snapshot,p_manifest,p_error);
 if coalesce((result->>'refreshed')::boolean,false) then
   perform public.portfolio_report_deployment((result->>'releaseId')::uuid,'runtime-sync','deployed',null);
 end if;
 return result;
end $$;
revoke all on function public.portfolio_finish_live_sync(uuid,uuid,jsonb,uuid,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.portfolio_finish_live_sync(uuid,uuid,jsonb,uuid,jsonb,jsonb,text) to service_role;
