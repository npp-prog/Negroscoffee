-- Kape Negros core schema: cities, shops, photos, menu items, submissions, profiles.
-- Target: Supabase (Postgres 15+, PostGIS in the `extensions` schema).

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.shop_type as enum ('specialty', 'chain', 'kapihan');
create type public.shop_status as enum ('draft', 'published', 'hidden');
create type public.shop_source as enum ('admin', 'owner', 'import_osm');
create type public.province as enum ('negros_occidental', 'negros_oriental');
create type public.submission_kind as enum ('new_shop', 'claim', 'correction');
create type public.submission_status as enum ('pending', 'approved', 'rejected');
create type public.user_role as enum ('admin', 'owner', 'user');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Price tier from a 12 oz hot latte price in PHP: 1 <100, 2 100–149, 3 150–199, 4 200+.
-- Mirrors lib/tier.ts; keep both in sync.
create function public.price_tier_for(latte_price numeric)
returns smallint
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when latte_price is null then null
    when latte_price < 100 then 1
    when latte_price < 150 then 2
    when latte_price < 200 then 3
    else 4
  end::smallint
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'user',
  display_name text check (char_length(display_name) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Create a profile row whenever a user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Role checks used by RLS. SECURITY DEFINER so they can read profiles regardless of RLS.
create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role = 'admin' from public.profiles where id = (select auth.uid())), false)
$$;

-- ---------------------------------------------------------------------------
-- Cities
-- ---------------------------------------------------------------------------
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  province public.province not null,
  is_city boolean not null default false, -- component city vs municipality
  center extensions.geography(Point, 4326) not null,
  unique (name, province)
);

-- ---------------------------------------------------------------------------
-- Shops
-- ---------------------------------------------------------------------------
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 120),
  type public.shop_type,
  price_tier smallint check (price_tier between 1 and 4),
  latte_price numeric(7, 2) check (latte_price >= 0),
  description text check (char_length(description) <= 2000),
  address text,
  city_id uuid references public.cities (id) on delete set null,
  province public.province,
  location extensions.geography(Point, 4326) not null,
  -- {"mon": [{"open": "07:00", "close": "21:00"}], ..., "sun": []}; missing day = unknown
  hours jsonb check (hours is null or jsonb_typeof(hours) = 'object'),
  phone text,
  facebook_url text,
  instagram_url text,
  website text,
  google_place_id text, -- Google Places ID only; never store other Google data
  osm_id text unique, -- e.g. "node/123456"; used to dedupe OSM imports
  status public.shop_status not null default 'draft',
  source public.shop_source not null default 'admin',
  claimed_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- A published shop must be fully categorized.
  constraint shops_published_is_categorized
    check (status <> 'published' or (type is not null and price_tier is not null and province is not null))
);

create index shops_location_gix on public.shops using gist (location);
create index shops_status_idx on public.shops (status);
create index shops_city_idx on public.shops (city_id);
create index shops_name_trgm_idx on public.shops using gin (name extensions.gin_trgm_ops);

create trigger shops_set_updated_at
before update on public.shops
for each row execute function public.set_updated_at();

-- Auto-suggest the tier from latte_price when no tier is set; an explicit tier (admin override) wins.
create function public.shops_suggest_tier()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.price_tier is null and new.latte_price is not null then
    new.price_tier := public.price_tier_for(new.latte_price);
  end if;
  return new;
end;
$$;

create trigger shops_suggest_tier
before insert or update of latte_price, price_tier on public.shops
for each row execute function public.shops_suggest_tier();

-- ---------------------------------------------------------------------------
-- Photos and menu
-- ---------------------------------------------------------------------------
create table public.shop_photos (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  storage_path text not null, -- path inside the `shop-photos` bucket
  caption text check (char_length(caption) <= 200),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index shop_photos_shop_idx on public.shop_photos (shop_id, sort_order);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  price numeric(7, 2) not null check (price >= 0),
  category text check (char_length(category) <= 40),
  sort_order int not null default 0
);
create index menu_items_shop_idx on public.menu_items (shop_id, sort_order);

-- ---------------------------------------------------------------------------
-- Submissions (suggest / claim / correction) — the approval queue
-- ---------------------------------------------------------------------------
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  kind public.submission_kind not null,
  shop_id uuid references public.shops (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  submitter_id uuid references auth.users (id) on delete set null,
  submitter_name text check (char_length(submitter_name) <= 120),
  submitter_email text check (submitter_email is null or submitter_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  proof_url text,
  status public.submission_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  constraint submissions_shop_required check (kind = 'new_shop' or shop_id is not null),
  constraint submissions_claim_has_proof check (kind <> 'claim' or proof_url is not null)
);
create index submissions_status_idx on public.submissions (status, created_at desc);
