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
