-- When a shop first went (or last went back) live, for "New" badges and the New filter.
-- Always derived by trigger: set when status becomes 'published', otherwise unchanged.

alter table public.shops add column published_at timestamptz;

-- Existing published shops: best available guess.
update public.shops set published_at = coalesce(verified_at, updated_at, created_at) where status = 'published';

create function public.shops_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.published_at := case when new.status = 'published' then now() else null end;
  elsif new.status = 'published' and old.status is distinct from 'published' then
    new.published_at := now();
  else
    new.published_at := old.published_at; -- nobody sets it by hand
  end if;
  return new;
end;
$$;

create trigger shops_set_published_at
before insert or update on public.shops
for each row execute function public.shops_set_published_at();

create index shops_published_at_idx on public.shops (published_at desc) where status = 'published';

-- Expose on the card view (columns can only be appended).
create or replace view public.shop_cards
with (security_invoker = true)
as
select
  s.id,
  s.slug,
  s.name,
  s.type,
  s.price_tier,
  s.latte_price,
  s.address,
  c.slug as city_slug,
  c.name as city_name,
  s.province,
  extensions.st_y(s.location::extensions.geometry) as lat,
  extensions.st_x(s.location::extensions.geometry) as lng,
  s.hours,
  (
    select p.storage_path
    from public.shop_photos p
    where p.shop_id = s.id
    order by p.sort_order, p.created_at
    limit 1
  ) as cover_path,
  s.verified_at,
  s.status,
  s.rating_avg,
  s.rating_count,
  s.published_at
from public.shops s
left join public.cities c on c.id = s.city_id;
