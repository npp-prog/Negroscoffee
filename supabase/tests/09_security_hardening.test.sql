-- Security hardening (migration 20261122000008).
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  set role authenticated;
end $$;

-- Owner B owns bean-there-bacolod (from 02_owner_editing).
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
declare
  shop uuid := (select id from public.shops where slug = 'bean-there-bacolod');
  other uuid := (select id from public.shops where slug = 'brew-dumaguete');
  pid uuid;
begin
  begin
    update public.shops set rating_avg = 5, rating_count = 9999 where id = shop;
    raise exception 'owner faked rating';
  exception when insufficient_privilege then null;
  end;
  update public.shops set description = 'still editable' where id = shop;

  insert into public.shop_photos (shop_id, storage_path, credit, contributed_by)
  values (shop, shop || '/mine.jpg', 'Photo by Admin', '00000000-0000-0000-0000-00000000000a')
  returning id into pid;
  assert (select credit is null and contributed_by is null from public.shop_photos where id = pid), 'credit stripped';
  update public.shop_photos set credit = 'Forged' where id = pid;
  assert (select credit is null from public.shop_photos where id = pid), 'credit not editable';
  begin
    insert into public.shop_photos (shop_id, storage_path) values (shop, other || '/theirs.jpg');
    raise exception 'pointed at another shop''s file';
  exception when insufficient_privilege then null;
  end;
  delete from public.shop_photos where id = pid;
end $$;
reset role;

-- Hidden reviews can't be deleted by their author.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
insert into public.reviews (shop_id, user_id, rating, body)
select id, '00000000-0000-0000-0000-00000000000c', 1, 'rude' from public.shops where slug = 'brew-dumaguete';
reset role;
update public.reviews set status = 'hidden' where body = 'rude';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
declare
  n int;
begin
  delete from public.reviews where body = 'rude';
  get diagnostics n = row_count;
  assert n = 0, 'author deleted a hidden review';
end $$;
reset role;
delete from public.reviews where body = 'rude';

-- Submission rate limit: 10 per hour per signed-in person.
create temp table saved_subs as select * from public.submissions where submitter_id = '00000000-0000-0000-0000-00000000000c';
delete from public.submissions where submitter_id = '00000000-0000-0000-0000-00000000000c';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
begin
  for i in 1..10 loop
    insert into public.submissions (kind, payload, submitter_id) values ('new_shop', '{"name":"x"}', auth.uid());
  end loop;
  begin
    insert into public.submissions (kind, payload, submitter_id) values ('new_shop', '{"name":"x"}', auth.uid());
    raise exception 'limit not enforced';
  exception when check_violation then null;
  end;
  raise notice 'ok: security hardening';
end $$;
reset role;
delete from public.submissions where submitter_id = '00000000-0000-0000-0000-00000000000c';
insert into public.submissions select * from saved_subs;

-- Atomic menu / list replacement.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
declare
  shop uuid := (select id from public.shops where slug = 'bean-there-bacolod');
  other uuid := (select id from public.shops where slug = 'brew-dumaguete');
begin
  perform public.replace_menu(shop, '[{"name":"Latte","price":120},{"name":"Mocha","price":140,"category":"Hot"}]');
  assert (select string_agg(name, ',' order by sort_order) from public.menu_items where shop_id = shop) = 'Latte,Mocha', 'owner replaced menu';
  begin
    perform public.replace_menu(shop, '[{"name":"Ok","price":1},{"name":"Bad","price":-5}]');
    raise exception 'bad item accepted';
  exception when check_violation then null;
  end;
  assert (select count(*) from public.menu_items where shop_id = shop) = 2, 'failed replace left the old menu intact';
  begin
    perform public.replace_menu(other, '[{"name":"Hijack","price":1}]');
    raise exception 'owner replaced another shop''s menu';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$
declare
  l uuid;
begin
  insert into public.shop_lists (slug, title) values ('atomic', 'Atomic') returning id into l;
  perform public.replace_list_items(l, jsonb_build_array(jsonb_build_object('shop_id', (select id from public.shops where slug = 'brew-dumaguete'), 'note', 'yes')));
  begin
    perform public.replace_list_items(l, '[{"shop_id":"00000000-0000-0000-0000-0000000000ff"}]');
    raise exception 'missing shop accepted';
  exception when foreign_key_violation then null;
  end;
  assert (select count(*) from public.shop_list_items where list_id = l) = 1, 'failed replace kept old items';
  delete from public.shop_lists where id = l;
  raise notice 'ok: atomic replace';
end $$;
reset role;

-- top_shops sums in SQL; owners only see their own shops.
insert into public.shop_daily_stats (shop_id, day, views, map_opens, directions)
select id, (now() at time zone 'Asia/Manila')::date, 4, 1, 2 from public.shops where slug = 'bean-there-bacolod';
insert into public.shop_daily_stats (shop_id, day, views)
select id, (now() at time zone 'Asia/Manila')::date, 9 from public.shops where slug = 'brew-dumaguete';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert (select string_agg(slug || ':' || views || ':' || directions, ',') from public.top_shops(7, 5)) = 'brew-dumaguete:9:0,bean-there-bacolod:5:2', 'admin top shops';
end $$;
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$ begin
  assert (select count(*) from public.top_shops(7, 5)) = 1, 'owner sees only own shop';
  raise notice 'ok: top shops';
end $$;
reset role;
delete from public.shop_daily_stats;
