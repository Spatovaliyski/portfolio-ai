-- Owner curation removals invalidate rollback snapshots in the publication transaction,
-- just as provider-detected privacy changes do in the synchronization transaction.
create function portfolio_private.invalidate_repositories(p_excluded jsonb) returns void language sql security definer set search_path='' as $$
  update public.portfolio_releases r set state='invalidated' where r.state<>'invalidated' and exists (
    select 1 from jsonb_array_elements_text(coalesce(p_excluded,'[]')) x(id) where
      exists(select 1 from jsonb_array_elements(r.snapshot#>'{github,repositories}') repo where repo->>'id'=x.id)
      or exists(select 1 from jsonb_array_elements(r.snapshot->'entities') e where e->>'kind'='repository' and e#>>'{data,githubId}'=x.id
        or exists(select 1 from jsonb_array_elements_text(coalesce(e#>'{data,repositoryIds}','[]')) ids where ids=x.id))
  );
$$;
revoke all on function portfolio_private.invalidate_repositories(jsonb) from public,anon,authenticated;
create or replace function public.portfolio_create_release(p_request_key uuid,p_base uuid,p_snapshot jsonb,p_manifest jsonb,p_rollback uuid default null) returns public.portfolio_releases
language plpgsql security definer set search_path='' as $$
declare v_control portfolio_private.release_control; v_release public.portfolio_releases;
begin
  select * into v_control from portfolio_private.release_control where singleton for update;
  select * into v_release from public.portfolio_releases where request_key=p_request_key;
  if found then return v_release; end if;
  if v_control.desired_release_id is distinct from p_base then raise exception 'Release base conflict' using errcode='40001'; end if;
  perform portfolio_private.invalidate_repositories(p_snapshot#>'{github,excludedIds}');
  insert into public.portfolio_releases(request_key,base_release_id,snapshot,revision_manifest,rollback_of) values(p_request_key,p_base,p_snapshot,p_manifest,p_rollback) returning * into v_release;
  update public.portfolio_releases set snapshot=jsonb_set(jsonb_set(snapshot,'{releaseId}',to_jsonb(v_release.id::text)),'{generation}',to_jsonb(v_release.generation)) where id=v_release.id returning * into v_release;
  update portfolio_private.release_control set desired_release_id=v_release.id where singleton;
  insert into public.portfolio_audit(action,release_id) values(case when p_rollback is null then 'approve' else 'rollback' end,v_release.id);
  return v_release;
end $$;
create or replace function public.portfolio_finish_sync(p_token uuid,p_job uuid,p_snapshot jsonb,p_expected_desired uuid,p_refresh_snapshot jsonb,p_manifest jsonb,p_error text default null) returns jsonb
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
  perform portfolio_private.invalidate_repositories(p_snapshot->'excludedIds');
  if p_refresh_snapshot is not null then select * into v_release from public.portfolio_create_release(gen_random_uuid(),p_expected_desired,p_refresh_snapshot,p_manifest,null); end if;
  perform public.portfolio_release_lock('github',p_token);
  return jsonb_build_object('refreshed',v_release.id is not null,'releaseId',v_release.id);
end $$;
