-- Owner insights (migration 20261122000006).
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  set role authenticated;
end $$;

-- Anonymous visitors count events but can't read them.
set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
select public.track_shop_event('bean-there-bacolod', 'view');
select public.track_shop_event('bean-there-bacolod', 'view');
select public.track_shop_event('bean-there-bacolod', 'directions');
select public.track_shop_event('bean-there-bacolod', 'map');
select public.track_shop_event('bean-there-bacolod', 'contact');
select public.track_shop_event('bean-there-bacolod', 'bogus');
select public.track_shop_event('secret-draft', 'view');
do $$
begin
  begin
    perform count(*) from public.shop_daily_stats;
    raise exception 'anon read stats';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.shop_insights((select id from public.shops where slug = 'bean-there-bacolod'));
    raise exception 'anon read insights';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

do $$
begin
  assert (select views || ',' || map_opens || ',' || directions || ',' || contacts
          from public.shop_daily_stats s join public.shops p on p.id = s.shop_id
          where p.slug = 'bean-there-bacolod') = '2,1,1,1', 'counted';
  assert not exists (select 1 from public.shop_daily_stats s join public.shops p on p.id = s.shop_id
                     where p.slug = 'secret-draft'), 'drafts not counted';
  assert (select day from public.shop_daily_stats limit 1) = (now() at time zone 'Asia/Manila')::date, 'Manila date';
  -- last period, for the comparison
  insert into public.shop_daily_stats (shop_id, day, views)
  select id, (now() at time zone 'Asia/Manila')::date - 40, 5 from public.shops where slug = 'bean-there-bacolod';
end $$;

-- The shop's owner (B) reads insights; another user (C) can't.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
declare
  j jsonb := public.shop_insights((select id from public.shops where slug = 'bean-there-bacolod'), 30);
begin
  assert jsonb_array_length(j->'series') = 30, '30 days';
  assert (j->'series'->29->>'views')::int = 2, 'today last';
  assert (j->'previous'->>'views')::int = 5, 'previous period';
  assert (select count(*) from public.shop_daily_stats) >= 1, 'owner reads own rows';
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
begin
  begin
    perform public.shop_insights((select id from public.shops where slug = 'bean-there-bacolod'));
    raise exception 'non-owner read insights';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.shop_daily_stats) = 0, 'non-owner sees no rows';
  raise notice 'ok: shop insights';
end $$;
reset role;
delete from public.shop_daily_stats;
