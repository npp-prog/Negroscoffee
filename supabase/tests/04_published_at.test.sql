-- published_at (migration 20261122000003) is derived, never set by hand.
do $$
declare
  t timestamptz;
begin
  insert into public.shops (slug, name, type, latte_price, province, location, status)
  values ('new-draft', 'New Draft', 'kapihan', 80, 'negros_occidental', 'SRID=4326;POINT(122.95 10.67)', 'draft');
  assert (select published_at is null from public.shops where slug = 'new-draft'), 'draft has no published_at';

  update public.shops set status = 'published' where slug = 'new-draft';
  select published_at into t from public.shops where slug = 'new-draft';
  assert t is not null, 'set when published';

  update public.shops set published_at = '2000-01-01', description = 'x' where slug = 'new-draft';
  assert (select published_at from public.shops where slug = 'new-draft') = t, 'cannot be set by hand';

  update public.shops set status = 'hidden' where slug = 'new-draft';
  assert (select published_at from public.shops where slug = 'new-draft') = t, 'kept when hidden';

  insert into public.shops (slug, name, type, latte_price, province, location, status)
  values ('born-live', 'Born Live', 'chain', 150, 'negros_oriental', 'SRID=4326;POINT(123.30 9.31)', 'published');
  assert (select published_at is not null from public.shops where slug = 'born-live'), 'set on insert as published';
  assert (select published_at is not null from public.shop_cards where slug = 'born-live'), 'exposed on shop_cards';
  raise notice 'ok: published_at';
end $$;

-- notify_email (migration 20261122000004): users toggle their own, not others'.
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  set role authenticated;
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
declare
  n int;
begin
  assert (select notify_email from public.profiles where id = auth.uid()), 'defaults to on';
  update public.profiles set notify_email = false where id = auth.uid();
  assert not (select notify_email from public.profiles where id = auth.uid()), 'user turned it off';
  update public.profiles set notify_email = false where id = '00000000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  assert n = 0, 'cannot change someone else';
  update public.profiles set notify_email = true where id = auth.uid();
  raise notice 'ok: notify_email';
end $$;
reset role;
