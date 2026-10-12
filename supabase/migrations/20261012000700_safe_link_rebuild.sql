-- Hosted Postgres rejects DELETE without a WHERE clause.
create or replace function public.portfolio_save_entity(p_entity jsonb, p_expected_version bigint) returns jsonb
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
