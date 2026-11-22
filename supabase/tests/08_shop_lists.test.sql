-- Coffee lists (migration 20261122000007).
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  set role authenticated;
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$
declare
  l uuid;
begin
  insert into public.shop_lists (slug, title, status) values ('best-kapihan', 'Best kapihan', 'draft') returning id into l;
  insert into public.shop_list_items (list_id, shop_id, position, note)
  select l, id, 1, 'Try the tablea' from public.shops where slug = 'kapihan-ni-lola';
  insert into public.shop_lists (slug, title, status) values ('live-list', 'Live list', 'published');
  insert into public.shop_list_items (list_id, shop_id, position)
  select (select id from public.shop_lists where slug = 'live-list'), id, 1 from public.shops where slug = 'brew-dumaguete';
  assert (select published_at is not null from public.shop_lists where slug = 'live-list'), 'published_at set';
  assert (select published_at is null from public.shop_lists where slug = 'best-kapihan'), 'draft has none';
end $$;
reset role;

set role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', false);
do $$
begin
  assert (select count(*) from public.shop_lists) = 1, 'anon sees published lists only';
  assert (select count(*) from public.shop_list_items) = 1, 'anon sees items of published lists only';
  begin
    insert into public.shop_lists (slug, title) values ('spam', 'Spam');
    raise exception 'anon created a list';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
declare
  n int;
begin
  update public.shop_lists set title = 'Hacked' where slug = 'live-list';
  get diagnostics n = row_count;
  assert n = 0, 'users cannot edit lists';
  begin
    insert into public.shop_list_items (list_id, shop_id)
    select (select id from public.shop_lists where slug = 'live-list'), id from public.shops where slug = 'bean-there-bacolod';
    raise exception 'user added to list';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ok: shop lists';
end $$;
reset role;
delete from public.shop_lists;
