select (select jsonb_agg(tablename) from pg_tables where schemaname='public') as public_tables,
       (select count(*) from auth.users) as auth_users,
       (select jsonb_agg(jsonb_build_object('id',id,'public',public)) from storage.buckets) as buckets;
