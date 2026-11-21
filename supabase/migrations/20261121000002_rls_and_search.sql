-- Row-level security, column grants, and geo search RPCs.

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.cities enable row level security;
alter table public.shops enable row level security;
alter table public.shop_photos enable row level security;
alter table public.menu_items enable row level security;
alter table public.submissions enable row level security;

-- Profiles: you see yourself; admins see and manage everyone.
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: admin read" on public.profiles
  for select to authenticated using ((select public.is_admin()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: admin update" on public.profiles
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
-- Only admins (or the service role / migrations) may change a role.
create function public.profiles_guard_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated')
     and not public.is_admin() then
    raise exception 'only admins can change roles' using errcode = 'insufficient_privilege';
  end if;
  if new.id is distinct from old.id then
    raise exception 'profile id is immutable' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
before update on public.profiles
for each row execute function public.profiles_guard_role();

-- Cities: public read, admin write.
create policy "cities: public read" on public.cities
  for select to anon, authenticated using (true);
create policy "cities: admin write" on public.cities
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Shops: public reads published; admins read and write everything.
create policy "shops: public read published" on public.shops
  for select to anon, authenticated using (status = 'published');
create policy "shops: owner read claimed" on public.shops
  for select to authenticated using (claimed_by = (select auth.uid()));
create policy "shops: admin read" on public.shops
  for select to authenticated using ((select public.is_admin()));
create policy "shops: admin insert" on public.shops
  for insert to authenticated with check ((select public.is_admin()));
create policy "shops: admin update" on public.shops
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "shops: admin delete" on public.shops
  for delete to authenticated using ((select public.is_admin()));

-- Photos and menu items follow their shop's visibility.
create policy "shop_photos: public read" on public.shop_photos
  for select to anon, authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.status = 'published'));
create policy "shop_photos: admin all" on public.shop_photos
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "menu_items: public read" on public.menu_items
  for select to anon, authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.status = 'published'));
create policy "menu_items: admin all" on public.menu_items
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Submissions: anyone can file one (as pending, unreviewed). Signed-in owners may only send
-- corrections for shops they have claimed. Submitters read their own; admins manage all.
create policy "submissions: anyone insert" on public.submissions
  for insert to anon, authenticated
  with check (
    status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and notes is null
    and (submitter_id is null or submitter_id = (select auth.uid()))
    and (
      kind <> 'correction'
      or coalesce((select public.current_user_role()), 'user') <> 'owner'
      or exists (
        select 1 from public.shops s where s.id = shop_id and s.claimed_by = (select auth.uid())
      )
    )
  );
create policy "submissions: read own" on public.submissions
  for select to authenticated using (submitter_id = (select auth.uid()));
create policy "submissions: admin read" on public.submissions
  for select to authenticated using ((select public.is_admin()));
create policy "submissions: admin update" on public.submissions
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "submissions: admin delete" on public.submissions
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Shop cards: the flat shape the map and list use. security_invoker → RLS applies.
-- ---------------------------------------------------------------------------
create view public.shop_cards
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
  s.status
from public.shops s
left join public.cities c on c.id = s.city_id;

grant select on public.shop_cards to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Search RPCs (published shops only). Filters are optional; null = no filter.
-- "Open now" is evaluated client-side from `hours` (Asia/Manila) — see lib/hours.ts.
-- ---------------------------------------------------------------------------

-- Distance-sorted shops within radius_m metres of (lat, lng).
create function public.shops_near(
  lat double precision,
  lng double precision,
  radius_m double precision default 5000,
  types public.shop_type[] default null,
  tiers smallint[] default null,
  city text default null, -- city slug
  q text default null,
  max_results int default 100
)
returns table (
  id uuid,
  slug text,
  name text,
  type public.shop_type,
  price_tier smallint,
  latte_price numeric,
  address text,
  city_slug text,
  city_name text,
  province public.province,
  lat double precision,
  lng double precision,
  hours jsonb,
  cover_path text,
  verified_at timestamptz,
  distance_m double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with origin as (
    select extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography as g
  )
  select
    c.id, c.slug, c.name, c.type, c.price_tier, c.latte_price, c.address, c.city_slug, c.city_name,
    c.province, c.lat, c.lng, c.hours, c.cover_path, c.verified_at,
    extensions.st_distance(s.location, o.g) as distance_m
  from public.shop_cards c
  join public.shops s on s.id = c.id
  cross join origin o
  where c.status = 'published'
    and extensions.st_dwithin(s.location, o.g, least(greatest(radius_m, 0), 200000))
    and (types is null or c.type = any (types))
    and (tiers is null or c.price_tier = any (tiers))
    and (city is null or c.city_slug = city)
    and (q is null or q = '' or c.name operator(extensions.%) q or c.name ilike '%' || q || '%'
         or c.city_name ilike '%' || q || '%')
  order by distance_m
  limit least(greatest(max_results, 1), 500)
$$;

-- Shops inside a map viewport, for "Search this area" and the initial map load.
create function public.shops_in_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  types public.shop_type[] default null,
  tiers smallint[] default null,
  city text default null,
  q text default null,
  max_results int default 500
)
returns setof public.shop_cards
language sql
stable
security invoker
set search_path = ''
as $$
  select c.*
  from public.shop_cards c
  join public.shops s on s.id = c.id
  where c.status = 'published'
    and s.location operator(extensions.&&)
      extensions.st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::extensions.geography
    and (types is null or c.type = any (types))
    and (tiers is null or c.price_tier = any (tiers))
    and (city is null or c.city_slug = city)
    and (q is null or q = '' or c.name operator(extensions.%) q or c.name ilike '%' || q || '%'
         or c.city_name ilike '%' || q || '%')
  order by c.name
  limit least(greatest(max_results, 1), 1000)
$$;

grant execute on function public.shops_near to anon, authenticated;
grant execute on function public.shops_in_bbox to anon, authenticated;
grant execute on function public.price_tier_for to anon, authenticated;

-- is_admin() and current_user_role() keep the default EXECUTE grant: policies evaluated for
-- anon (e.g. submissions insert) call them, and they only ever describe the caller.
