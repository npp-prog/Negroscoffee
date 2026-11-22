-- Owner editing (migration 20261122000001). Runs after 01_schema_rls.test.sql, reusing its
-- fixtures: owner B claims bean-there-bacolod (published); kapihan-ni-lola is not theirs.

create or replace function pg_temp.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', false); set role anon;
$$;
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  set role authenticated;
end $$;

-- Owner B ------------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
declare
  n int;
begin
  assert public.owns_shop('10000000-0000-0000-0000-000000000001'), 'owner owns claimed shop';
  assert not public.owns_shop('10000000-0000-0000-0000-000000000002'), 'not someone else''s shop';

  -- Allowed fields; tier follows the latte price.
  update public.shops
     set description = 'Fresh beans daily', latte_price = 205, hours = '{"mon":[{"open":"07:00","close":"20:00"}]}',
         phone = '0917 000 0000', instagram_url = 'instagram.com/beanthere'
   where id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'owner can update own shop';
  assert (select price_tier from public.shops where id = '10000000-0000-0000-0000-000000000001') = 4,
    'tier follows latte price';
  assert (select changes->'fields' from public.shop_edits
          where shop_id = '10000000-0000-0000-0000-000000000001' order by created_at desc limit 1)
         @> '["description","latte_price","hours","phone","instagram_url"]', 'edit logged';

  -- Clearing the price keeps the tier.
  update public.shops set latte_price = null where id = '10000000-0000-0000-0000-000000000001';
  assert (select price_tier from public.shops where id = '10000000-0000-0000-0000-000000000001') = 4,
    'tier kept when price cleared';

  -- Locked fields.
  begin
    update public.shops set status = 'hidden' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'owner changed status';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.shops set location = 'SRID=4326;POINT(123 10)' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'owner moved the pin';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.shops set price_tier = 1 where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'owner set tier directly';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.shops set claimed_by = null where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'owner unclaimed';
  exception when insufficient_privilege or check_violation then null;
  end;

  -- Someone else's shop: RLS hides the row from UPDATE.
  update public.shops set description = 'hijack' where id = '10000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  assert n = 0, 'cannot edit another shop';

  -- Menu and photos of own shop only.
  insert into public.menu_items (shop_id, name, price) values ('10000000-0000-0000-0000-000000000001', 'Latte', 205);
  begin
    insert into public.menu_items (shop_id, name, price) values ('10000000-0000-0000-0000-000000000002', 'X', 1);
    raise exception 'owner added menu to another shop';
  exception when insufficient_privilege then null;
  end;
  insert into public.shop_photos (shop_id, storage_path) values ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001/a.jpg');
  insert into storage.objects (bucket_id, name) values ('shop-photos', '10000000-0000-0000-0000-000000000001/a.jpg');
  begin
    insert into storage.objects (bucket_id, name) values ('shop-photos', '10000000-0000-0000-0000-000000000002/b.jpg');
    raise exception 'owner uploaded to another shop folder';
  exception when insufficient_privilege then null;
  end;

  -- Audit log: own entries visible, can log menu changes for own shop only.
  insert into public.shop_edits (shop_id, user_id, changes) values ('10000000-0000-0000-0000-000000000001', auth.uid(), '{"menu":1}');
  begin
    insert into public.shop_edits (shop_id, user_id, changes) values ('10000000-0000-0000-0000-000000000002', auth.uid(), '{}');
    raise exception 'owner logged edit on another shop';
  exception when insufficient_privilege then null;
  end;

  -- Admin RPCs are refused.
  begin
    perform public.admin_link_owner('10000000-0000-0000-0000-000000000002', 'owner@example.test');
    raise exception 'owner used admin_link_owner';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: owner editing';
end $$;
reset role;

-- Plain user C cannot edit anything ---------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
declare
  n int;
begin
  update public.shops set description = 'x' where id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 0, 'user cannot edit';
  assert (select count(*) from public.shop_edits) = 0, 'user sees no edit log';
  raise notice 'ok: non-owner';
end $$;
reset role;

-- Admin ---------------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$
declare
  uid uuid;
begin
  assert (select count(*) from public.shop_edits) >= 2, 'admin reads edit log';
  -- Admin edits are not logged and are unrestricted.
  update public.shops set status = 'published', price_tier = 3 where id = '10000000-0000-0000-0000-000000000001';
  assert (select price_tier from public.shops where id = '10000000-0000-0000-0000-000000000001') = 3, 'admin override';
  -- Link user C as owner of kapihan-ni-lola by email.
  uid := public.admin_link_owner('10000000-0000-0000-0000-000000000002', 'USER@example.test');
  assert uid = '00000000-0000-0000-0000-00000000000c', 'linked by email (case-insensitive)';
  assert (select role from public.profiles where id = uid) = 'owner', 'user promoted to owner';
  assert public.admin_owner_email('10000000-0000-0000-0000-000000000002') = 'user@example.test';
  begin
    perform public.admin_link_owner('10000000-0000-0000-0000-000000000002', 'nobody@example.test');
    raise exception 'linked unknown email';
  exception when no_data_found then null;
  end;
  perform public.admin_unlink_owner('10000000-0000-0000-0000-000000000002');
  assert (select claimed_by from public.shops where id = '10000000-0000-0000-0000-000000000002') is null, 'unlinked';
  raise notice 'ok: admin owner tools';
end $$;
reset role;

-- Anon cannot call admin RPCs ---------------------------------------------------------------
select pg_temp.as_anon();
do $$
begin
  begin
    perform public.admin_owner_email('10000000-0000-0000-0000-000000000001');
    raise exception 'anon called admin rpc';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: anon';
end $$;
reset role;
