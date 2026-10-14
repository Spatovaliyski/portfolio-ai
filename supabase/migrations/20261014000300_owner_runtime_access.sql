-- The VPS uses owner sessions for writes and the published-only Edge endpoint for reads.
-- No service-role credential is needed on the VPS.
create function public.portfolio_owner_rate_limit() returns boolean
language plpgsql security definer set search_path='' as $$
begin
  if not public.portfolio_is_owner() then raise exception 'Owner MFA required' using errcode='42501'; end if;
  return public.portfolio_rate_limit('owner:' || auth.uid()::text,120);
end $$;
revoke all on function public.portfolio_owner_rate_limit() from public,anon;
grant execute on function public.portfolio_owner_rate_limit() to authenticated;
create policy portfolio_derivative_owner_insert on storage.objects for insert to authenticated
with check(bucket_id='portfolio-media' and public.portfolio_is_owner());
