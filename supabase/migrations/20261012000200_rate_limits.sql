create table portfolio_private.request_limits (
  scope text primary key, minute timestamptz not null, count integer not null
);
create function public.portfolio_rate_limit(p_scope text,p_limit integer) returns boolean language plpgsql security definer set search_path='' as $$
declare v_count integer;
begin
  if p_limit < 1 or p_limit > 1000 or length(p_scope)>100 then raise exception 'Invalid limit'; end if;
  insert into portfolio_private.request_limits(scope,minute,count) values(p_scope,date_trunc('minute',now()),1)
    on conflict(scope) do update set minute=excluded.minute,count=case when portfolio_private.request_limits.minute=excluded.minute then portfolio_private.request_limits.count+1 else 1 end
    returning count into v_count;
  return v_count <= p_limit;
end $$;
revoke all on function public.portfolio_rate_limit(text,integer) from public,anon,authenticated;
grant execute on function public.portfolio_rate_limit(text,integer) to service_role;
