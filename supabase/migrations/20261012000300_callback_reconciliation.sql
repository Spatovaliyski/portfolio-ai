-- A callback can arrive after a new desired release is approved. Record the actual
-- active generation while rejecting a callback older than the already active one.
create or replace function public.portfolio_report_deployment(p_id uuid,p_build text,p_state text,p_error text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_release public.portfolio_releases; v_current public.portfolio_releases; v_control portfolio_private.release_control;
begin
  if p_state not in ('building','deployed','failed') then raise exception 'Invalid state'; end if;
  select * into v_control from portfolio_private.release_control where singleton for update;
  select * into strict v_release from public.portfolio_releases where id=p_id for update;
  if v_release.state in ('invalidated','superseded') then raise exception 'Release is no longer deployable'; end if;
  if v_release.state='deployed' then return jsonb_build_object('state','deployed'); end if;
  if p_state='building' and v_control.desired_release_id is distinct from p_id then raise exception 'Release is no longer desired'; end if;
  if p_state='deployed' then
    select * into v_current from public.portfolio_releases where id=v_control.active_release_id;
    if v_current.generation is not null and v_current.generation >= v_release.generation then raise exception 'Older deployment rejected'; end if;
    update portfolio_private.release_control set active_release_id=p_id where singleton;
  end if;
  update public.portfolio_releases set state=p_state,build_id=p_build,failure=left(p_error,1000),deployed_at=case when p_state='deployed' then now() else deployed_at end where id=p_id;
  insert into public.portfolio_audit(action,release_id) values(p_state,p_id);
  return jsonb_build_object('state',p_state);
end $$;
