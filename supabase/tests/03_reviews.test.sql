-- Reviews and saved shops (migration 20261122000002). Reuses fixtures from 01/02:
-- shop 1 bean-there (published, owned by B), shop 2 kapihan-ni-lola (published, unowned),
-- shop 4 secret-draft (draft). Users: A admin, B owner, C regular.

create or replace function pg_temp.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', false); set role anon;
$$;
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  set role authenticated;
end $$;

update public.profiles set display_name = 'Carla' where id = '00000000-0000-0000-0000-00000000000c';

-- User C reviews ----------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
begin
  insert into public.reviews (shop_id, user_id, rating, body, status, owner_reply, author_name)
  values ('10000000-0000-0000-0000-000000000001', auth.uid(), 5, 'Great flat white', 'hidden', 'fake reply', 'Fake');
  assert (select status || '|' || author_name || '|' || coalesce(owner_reply, '-') from public.reviews
          where user_id = auth.uid() and shop_id = '10000000-0000-0000-0000-000000000001') = 'visible|Carla|-',
    'insert forces visible, real name, no reply';
  begin
    insert into public.reviews (shop_id, user_id, rating) values ('10000000-0000-0000-0000-000000000001', auth.uid(), 3);
    raise exception 'second review allowed';
  exception when unique_violation then null;
  end;
  begin
    insert into public.reviews (shop_id, user_id, rating) values ('10000000-0000-0000-0000-000000000004', auth.uid(), 3);
    raise exception 'reviewed a draft';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.reviews (shop_id, user_id, rating) values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000b', 1);
    raise exception 'reviewed as someone else';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.reviews (shop_id, user_id, rating) values ('10000000-0000-0000-0000-000000000002', auth.uid(), 6);
    raise exception 'rating 6 allowed';
  exception when check_violation then null;
  end;
  -- Edit own rating; cannot hide or reply.
  update public.reviews set rating = 4, body = 'Great flat white, slow service'
   where user_id = auth.uid() and shop_id = '10000000-0000-0000-0000-000000000001';
  begin
    update public.reviews set status = 'hidden' where user_id = auth.uid();
    raise exception 'author hid review';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.reviews set owner_reply = 'me' where user_id = auth.uid();
    raise exception 'author replied as owner';
  exception when insufficient_privilege then null;
  end;
  -- Saved shops are private.
  insert into public.saved_shops (user_id, shop_id, kind) values (auth.uid(), '10000000-0000-0000-0000-000000000001', 'favorite');
  insert into public.saved_shops (user_id, shop_id, kind) values (auth.uid(), '10000000-0000-0000-0000-000000000001', 'visited');
  begin
    insert into public.saved_shops (user_id, shop_id, kind) values ('00000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000001', 'favorite');
    raise exception 'saved for someone else';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: reviewer';
end $$;
reset role;

-- Aggregates (superuser view) ---------------------------------------------------------------------
do $$
begin
  assert (select rating_avg || '|' || rating_count from public.shops where id = '10000000-0000-0000-0000-000000000001') = '4.0|1',
    'aggregate after edit';
  assert (select rating_avg from public.shop_cards where id = '10000000-0000-0000-0000-000000000001') = 4.0, 'shop_cards exposes rating';
  raise notice 'ok: aggregates';
end $$;

-- Owner B: cannot review own shop, can reply ------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
declare
  n int;
begin
  begin
    insert into public.reviews (shop_id, user_id, rating) values ('10000000-0000-0000-0000-000000000001', auth.uid(), 5);
    raise exception 'owner reviewed own shop';
  exception when insufficient_privilege then null;
  end;
  update public.reviews set owner_reply = 'Thanks! We added a second barista.'
   where shop_id = '10000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  assert n = 1, 'owner replied';
  assert (select owner_replied_at is not null from public.reviews where shop_id = '10000000-0000-0000-0000-000000000001'), 'reply timestamp';
  begin
    update public.reviews set rating = 5 where shop_id = '10000000-0000-0000-0000-000000000001';
    raise exception 'owner changed rating';
  exception when insufficient_privilege then null;
  end;
  -- Owner reviews another shop (allowed).
  insert into public.reviews (shop_id, user_id, rating) values ('10000000-0000-0000-0000-000000000002', auth.uid(), 2);
  -- Owner cannot see C's saved shops.
  assert (select count(*) from public.saved_shops) = 0, 'saved shops are private';
  raise notice 'ok: owner reply';
end $$;
reset role;

-- Anon sees visible reviews only ------------------------------------------------------------
select pg_temp.as_anon();
do $$
begin
  assert (select count(*) from public.reviews) = 2, 'anon reads visible reviews';
  assert (select owner_reply from public.reviews where shop_id = '10000000-0000-0000-0000-000000000001') like 'Thanks%';
  begin
    insert into public.reviews (shop_id, user_id, rating) values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000c', 5);
    raise exception 'anon reviewed';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: anon';
end $$;
reset role;

-- Admin moderation -------------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$
begin
  update public.reviews set status = 'hidden' where shop_id = '10000000-0000-0000-0000-000000000002';
  raise notice 'ok: admin hid';
end $$;
reset role;

do $$
begin
  assert (select rating_avg is null and rating_count = 0 from public.shops where id = '10000000-0000-0000-0000-000000000002'),
    'hidden reviews drop out of the aggregate';
end $$;

select pg_temp.as_anon();
do $$
begin
  assert (select count(*) from public.reviews) = 1, 'hidden review not public';
end $$;
reset role;

-- Renaming updates review names; deleting a review updates the aggregate ---------------------------
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
begin
  update public.profiles set display_name = 'Carla R.' where id = auth.uid();
  assert (select author_name from public.reviews where user_id = auth.uid()) = 'Carla R.', 'name synced';
  delete from public.reviews where user_id = auth.uid();
  delete from public.saved_shops where user_id = auth.uid() and kind = 'visited';
  assert (select count(*) from public.saved_shops where user_id = auth.uid()) = 1, 'unsave';
  raise notice 'ok: rename + delete';
end $$;
reset role;

do $$
begin
  assert (select rating_avg is null and rating_count = 0 from public.shops where id = '10000000-0000-0000-0000-000000000001'),
    'aggregate after delete';
  raise notice 'ok: reviews done';
end $$;
