-- Database tests: tier logic, constraints, RLS per role, and search RPCs.
-- Run via supabase/tests/run.sh. Each block raises on failure (ON_ERROR_STOP).

-- Fixtures (as superuser, bypassing RLS) -------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.test', '{"full_name":"Ada Admin"}'),
  ('00000000-0000-0000-0000-00000000000b', 'owner@example.test', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'user@example.test', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a';
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-00000000000b';

insert into public.shops (id, slug, name, type, latte_price, province, city_id, location, status, claimed_by)
select v.id::uuid, v.slug, v.name, v.type::public.shop_type, v.latte, v.prov::public.province,
       (select id from public.cities where slug = v.city),
       extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography,
       v.status::public.shop_status, v.claimed::uuid
from (values
  ('10000000-0000-0000-0000-000000000001', 'bean-there-bacolod', 'Bean There', 'specialty', 165, 'negros_occidental', 'bacolod', 122.9530, 10.6770, 'published', '00000000-0000-0000-0000-00000000000b'),
  ('10000000-0000-0000-0000-000000000002', 'kapihan-ni-lola', 'Kapihan ni Lola', 'kapihan', 85, 'negros_occidental', 'bacolod', 122.9600, 10.6700, 'published', null),
  ('10000000-0000-0000-0000-000000000003', 'brew-dumaguete', 'Brew Dumaguete', 'chain', 140, 'negros_oriental', 'dumaguete', 123.3060, 9.3070, 'published', null),
  ('10000000-0000-0000-0000-000000000004', 'secret-draft', 'Secret Draft', null, null, null, null, 122.95, 10.68, 'draft', null)
) as v(id, slug, name, type, latte, prov, city, lng, lat, status, claimed);

-- Helpers to act as a role ----------------------------------------------------
create or replace function pg_temp.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '', false); set role anon;
$$;
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  set role authenticated;
end $$;

-- 1. Tier function and auto-suggest --------------------------------------------
do $$
begin
  assert public.price_tier_for(0) = 1;
  assert public.price_tier_for(99.99) = 1;
  assert public.price_tier_for(100) = 2;
  assert public.price_tier_for(149.99) = 2;
  assert public.price_tier_for(150) = 3;
  assert public.price_tier_for(199) = 3;
  assert public.price_tier_for(200) = 4;
  assert public.price_tier_for(null) is null;
  assert (select price_tier from public.shops where slug = 'bean-there-bacolod') = 3, 'auto tier from 165';
  assert (select price_tier from public.shops where slug = 'kapihan-ni-lola') = 1, 'auto tier from 85';
  -- Admin override survives a later latte_price change.
  update public.shops set price_tier = 4 where slug = 'brew-dumaguete';
  update public.shops set latte_price = 130 where slug = 'brew-dumaguete';
  assert (select price_tier from public.shops where slug = 'brew-dumaguete') = 4, 'override kept';
  update public.shops set price_tier = 2 where slug = 'brew-dumaguete';
  raise notice 'ok: tiers';
end $$;

-- 2. Constraints -----------------------------------------------------------------
do $$
begin
  begin
    update public.shops set status = 'published' where slug = 'secret-draft';
    raise exception 'uncategorized shop was published';
  exception when check_violation then null;
  end;
  begin
    insert into public.submissions (kind, payload) values ('claim', '{}');
    raise exception 'claim without shop/proof accepted';
  exception when check_violation then null;
  end;
  assert (select count(*) from public.cities) = 57, 'seeded 57 cities/municipalities';
  raise notice 'ok: constraints + seed';
end $$;

-- 3. Anonymous visitor --------------------------------------------------------------
select pg_temp.as_anon();
do $$
begin
  assert (select count(*) from public.shops) = 3, 'anon sees only published shops';
  assert (select count(*) from public.shop_cards) = 3, 'anon shop_cards published only';
  assert (select count(*) from public.cities) = 57, 'anon reads cities';
  begin
    insert into public.shops (slug, name, location) values ('x', 'X', 'SRID=4326;POINT(123 10)');
    raise exception 'anon inserted a shop';
  exception when insufficient_privilege then null;
  end;
  insert into public.submissions (kind, payload, submitter_email)
  values ('new_shop', '{"name":"New Spot"}', 'fan@example.test');
  begin
    insert into public.submissions (kind, payload, status) values ('new_shop', '{}', 'approved');
    raise exception 'anon self-approved a submission';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.submissions) = 0, 'anon cannot read submissions';
  update public.shops set name = 'Hacked' where slug = 'kapihan-ni-lola';
  raise notice 'ok: anon';
end $$;
reset role;
do $$ begin
  assert (select name from public.shops where slug = 'kapihan-ni-lola') = 'Kapihan ni Lola', 'anon update had no effect';
end $$;

-- 4. Regular signed-in user ----------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
begin
  assert (select count(*) from public.profiles) = 1, 'user sees only own profile';
  update public.profiles set display_name = 'Coffee Fan' where id = auth.uid();
  begin
    update public.profiles set role = 'admin' where id = auth.uid();
    raise exception 'user escalated own role';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.shops) = 3, 'user sees only published';
  insert into public.submissions (kind, shop_id, payload, submitter_id)
  values ('correction', '10000000-0000-0000-0000-000000000002', '{"phone":"0917"}', auth.uid());
  assert (select count(*) from public.submissions) = 1, 'user reads own submission';
  begin
    insert into public.submissions (kind, payload, submitter_id)
    values ('new_shop', '{}', '00000000-0000-0000-0000-00000000000a');
    raise exception 'user impersonated another submitter';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: user';
end $$;
reset role;

-- 5. Shop owner ----------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
begin
  insert into public.submissions (kind, shop_id, payload, submitter_id)
  values ('correction', '10000000-0000-0000-0000-000000000001', '{"hours":{}}', auth.uid());
  begin
    insert into public.submissions (kind, shop_id, payload, submitter_id)
    values ('correction', '10000000-0000-0000-0000-000000000002', '{"hours":{}}', auth.uid());
    raise exception 'owner corrected a shop they do not own';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.shops set name = 'Mine' where slug = 'bean-there-bacolod';
    if found then raise exception 'owner edited shop directly'; end if;
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: owner';
end $$;
reset role;

-- 6. Admin ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$
begin
  assert (select display_name from public.profiles where id = auth.uid()) = 'Ada Admin', 'profile from signup metadata';
  assert (select count(*) from public.shops) = 4, 'admin sees drafts';
  assert (select count(*) from public.submissions) = 3, 'admin sees all submissions';
  insert into public.shops (slug, name, type, latte_price, province, location, status)
  values ('admin-added', 'Admin Added', 'specialty', 210, 'negros_oriental', 'SRID=4326;POINT(123.30 9.31)', 'published');
  assert (select price_tier from public.shops where slug = 'admin-added') = 4;
  update public.submissions set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where kind = 'new_shop';
  update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-00000000000c';
  update public.profiles set role = 'user' where id = '00000000-0000-0000-0000-00000000000c';
  raise notice 'ok: admin';
end $$;
reset role;

-- 7. Search RPCs (as anon) -------------------------------------------------------------
select pg_temp.as_anon();
do $$
declare
  r record;
begin
  -- Near downtown Bacolod, 3 km: the two Bacolod shops, nearest first, never the draft.
  select array_agg(slug order by distance_m) as slugs, min(distance_m) as d
  into r from public.shops_near(10.6765, 122.9509, 3000);
  assert r.slugs = array['bean-there-bacolod', 'kapihan-ni-lola'], format('near: %s', r.slugs);
  assert r.d between 200 and 300, format('distance ~ 245 m, got %s', r.d);

  assert (select count(*) from public.shops_near(10.6765, 122.9509, 3000, types => array['kapihan']::public.shop_type[])) = 1;
  assert (select count(*) from public.shops_near(10.6765, 122.9509, 3000, tiers => array[3]::smallint[])) = 1;
  assert (select count(*) from public.shops_near(10.6765, 122.9509, 200000, city => 'dumaguete')) = 1, 'city filter (admin-added has no city)';
  assert (select count(*) from public.shops_near(10.6765, 122.9509, 3000, q => 'lola')) = 1;

  -- Whole island bbox: all 4 published shops; Dumaguete-only bbox: 2.
  assert (select count(*) from public.shops_in_bbox(122.3, 9.0, 123.6, 11.0)) = 4;
  assert (select count(*) from public.shops_in_bbox(123.2, 9.2, 123.4, 9.4)) = 2;
  assert (select lat from public.shops_in_bbox(123.2, 9.2, 123.4, 9.4) where slug = 'brew-dumaguete') between 9.30 and 9.31;
  raise notice 'ok: search';
end $$;
reset role;

-- 8. Storage policies --------------------------------------------------------------------
select pg_temp.as_anon();
do $$
begin
  insert into storage.objects (bucket_id, name) values ('submission-proofs', 'claims/abc/sign.jpg');
  begin
    insert into storage.objects (bucket_id, name) values ('shop-photos', 'shops/x.jpg');
    raise exception 'anon uploaded a shop photo';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from storage.objects where bucket_id = 'submission-proofs') = 0, 'proofs are private';
  raise notice 'ok: storage';
end $$;
reset role;
