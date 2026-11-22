-- Reviews (1–5 stars + optional text, one per user per shop), owner replies, moderation,
-- and personal favorites / "visited" lists. Ratings are aggregated onto shops for the map.

-- ---------------------------------------------------------------------------
-- Rating aggregates on shops (visible reviews only) + exposed on shop_cards.
-- ---------------------------------------------------------------------------
alter table public.shops
  add column rating_avg numeric(2, 1) check (rating_avg between 1 and 5),
  add column rating_count integer not null default 0 check (rating_count >= 0);

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
  s.rating_count
from public.shops s
left join public.cities c on c.id = s.city_id;

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null default 'Coffee lover' check (char_length(author_name) <= 80),
  rating smallint not null check (rating between 1 and 5),
  body text check (char_length(body) <= 1000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  owner_reply text check (char_length(owner_reply) <= 1000),
  owner_replied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, user_id)
);
create index reviews_shop_idx on public.reviews (shop_id, created_at desc);
create index reviews_created_idx on public.reviews (created_at desc);
alter table public.reviews enable row level security;

create policy "reviews: public read visible" on public.reviews
  for select to anon, authenticated using (status = 'visible');
create policy "reviews: author read own" on public.reviews
  for select to authenticated using (user_id = (select auth.uid()));
create policy "reviews: owner read shop" on public.reviews
  for select to authenticated using ((select public.owns_shop(shop_id)));
create policy "reviews: admin read" on public.reviews
  for select to authenticated using ((select public.is_admin()));

-- Signed-in users review published shops they don't own.
create policy "reviews: author insert" on public.reviews
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.shops s where s.id = shop_id and s.status = 'published')
    and not (select public.owns_shop(shop_id))
  );
create policy "reviews: author update" on public.reviews
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reviews: owner reply" on public.reviews
  for update to authenticated
  using ((select public.owns_shop(shop_id))) with check ((select public.owns_shop(shop_id)));
create policy "reviews: admin update" on public.reviews
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "reviews: author delete" on public.reviews
  for delete to authenticated using (user_id = (select auth.uid()));
create policy "reviews: admin delete" on public.reviews
  for delete to authenticated using ((select public.is_admin()));

grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;

-- New reviews: author name from the profile, visible, no reply yet.
create function public.reviews_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.author_name := coalesce(
    nullif(trim((select display_name from public.profiles where id = new.user_id)), ''),
    'Coffee lover'
  );
  if not public.is_admin() then
    new.status := 'visible';
    new.owner_reply := null;
    new.owner_replied_at := null;
  end if;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger reviews_before_insert
before insert on public.reviews
for each row execute function public.reviews_before_insert();

-- Who may change what: authors edit rating/body; the shop's owner edits the reply;
-- admins moderate (status) and may change anything.
create function public.reviews_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  is_author boolean := old.user_id = (select auth.uid());
  is_owner boolean := public.owns_shop(old.shop_id);
begin
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    new.updated_at := now();
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.shop_id is distinct from old.shop_id
     or new.author_name is distinct from old.author_name
     or new.status is distinct from old.status
     or new.created_at is distinct from old.created_at then
    raise exception 'that change is not allowed' using errcode = 'insufficient_privilege';
  end if;
  if (new.rating is distinct from old.rating or new.body is distinct from old.body) and not is_author then
    raise exception 'only the author can edit a review' using errcode = 'insufficient_privilege';
  end if;
  if new.owner_reply is distinct from old.owner_reply then
    if not is_owner then
      raise exception 'only the shop owner can reply' using errcode = 'insufficient_privilege';
    end if;
    new.owner_replied_at := case when new.owner_reply is null then null else now() end;
  elsif new.owner_replied_at is distinct from old.owner_replied_at then
    raise exception 'that change is not allowed' using errcode = 'insufficient_privilege';
  end if;
  if new.rating is distinct from old.rating or new.body is distinct from old.body then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger reviews_guard_update
before update on public.reviews
for each row execute function public.reviews_guard_update();

-- Keep shops.rating_avg / rating_count in sync (visible reviews only).
create function public.reviews_refresh_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.shop_id, old.shop_id);
begin
  update public.shops s
     set rating_avg = agg.avg, rating_count = agg.n
    from (
      select round(avg(r.rating)::numeric, 1) as avg, count(*)::int as n
      from public.reviews r
      where r.shop_id = target and r.status = 'visible'
    ) agg
   where s.id = target
     and (s.rating_avg is distinct from agg.avg or s.rating_count is distinct from agg.n);
  return null;
end;
$$;

create trigger reviews_refresh_rating
after insert or update of rating, status or delete on public.reviews
for each row execute function public.reviews_refresh_rating();

-- Renaming yourself updates the name shown on your reviews.
create function public.profiles_sync_review_names()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.display_name is distinct from old.display_name then
    update public.reviews
       set author_name = coalesce(nullif(trim(new.display_name), ''), 'Coffee lover')
     where user_id = new.id;
  end if;
  return null;
end;
$$;

create trigger profiles_sync_review_names
after update of display_name on public.profiles
for each row execute function public.profiles_sync_review_names();

-- ---------------------------------------------------------------------------
-- Favorites and "visited" (private to each user)
-- ---------------------------------------------------------------------------
create table public.saved_shops (
  user_id uuid not null references public.profiles (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  kind text not null check (kind in ('favorite', 'visited')),
  created_at timestamptz not null default now(),
  primary key (user_id, shop_id, kind)
);
create index saved_shops_user_idx on public.saved_shops (user_id, kind, created_at desc);
alter table public.saved_shops enable row level security;

create policy "saved_shops: own read" on public.saved_shops
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_shops: own insert" on public.saved_shops
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "saved_shops: own delete" on public.saved_shops
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.saved_shops to authenticated;
grant all on public.saved_shops to service_role;
