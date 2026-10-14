create or replace function public.portfolio_save_live(
  p_entity jsonb,p_expected_version bigint,p_base uuid,p_snapshot jsonb,
  p_manifest jsonb,p_request_key uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved jsonb; published public.portfolio_releases; prior public.portfolio_revisions; item jsonb; existing public.portfolio_entities; dependent jsonb;
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
  -- Privacy sanitation may update linked records; keep those changes in normal revision history too.
  for item in select e from jsonb_array_elements(p_snapshot->'entities') e
    join public.portfolio_revisions r on r.id=(p_manifest->>(e->>'id'))::uuid
    where e->>'id'<>p_entity->>'id' and r.entity<>e
    and not exists(select 1 from public.portfolio_releases old,lateral jsonb_array_elements(old.snapshot->'entities') previous where old.id=p_base and previous=e)
  loop
    select * into strict existing from public.portfolio_entities where id=item->>'id' for update;
    if existing.current_revision::text is distinct from p_manifest->>(item->>'id') then raise exception 'Version conflict' using errcode='40001'; end if;
    dependent := public.portfolio_save_entity(item,existing.version);
    p_manifest := jsonb_set(p_manifest,array[item->>'id'],dependent->'revisionId');
  end loop;
  if jsonb_array_length(p_snapshot->'entities') > 1000 or octet_length(p_snapshot::text)>6000000 then raise exception 'Invalid snapshot'; end if;
  if exists(select 1 from jsonb_array_elements(p_snapshot->'entities') e
    left join public.portfolio_revisions r on r.id=(p_manifest->>(e->>'id'))::uuid
    where e->>'status'<>'published' or r.id is null or (r.entity<>e and not exists(select 1 from public.portfolio_releases old, lateral jsonb_array_elements(old.snapshot->'entities') previous where old.id=p_base and previous=e))) then raise exception 'Snapshot does not match saved revisions'; end if;
  select * into published from public.portfolio_create_release(p_request_key,p_base,p_snapshot,p_manifest,null);
  perform public.portfolio_report_deployment(published.id,'runtime','deployed',null);
  return saved || jsonb_build_object('releaseId',published.id);
end $$;
