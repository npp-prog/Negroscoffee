-- Owner editing: verified owners (profiles.role = 'owner', shops.claimed_by = them) may update
-- the everyday details of their own shops directly. Identity fields stay admin-only.
-- Every non-admin change is logged in shop_edits for admins to review.

-- ---------------------------------------------------------------------------
-- Helper: is the caller the verified owner of this shop?
-- ---------------------------------------------------------------------------
create function public.owns_shop(p_shop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.shops s
    join public.profiles p on p.id = s.claimed_by
    where s.id = p_shop_id
      and s.claimed_by = (select auth.uid())
      and p.role in ('owner', 'admin')
  )
$$;

-- ---------------------------------------------------------------------------
-- Shops: owners update their own row; a trigger locks identity columns.
-- ---------------------------------------------------------------------------
create policy "shops: owner update own" on public.shops
  for update to authenticated
  using ((select public.owns_shop(id)))
  with check (claimed_by = (select auth.uid()));

create function public.shops_guard_owner_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Admins, the service role and migrations are unrestricted.
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;
  if new.name is distinct from old.name
     or new.slug is distinct from old.slug
     or new.type is distinct from old.type
     or new.status is distinct from old.status
     or new.location is distinct from old.location
     or new.city_id is distinct from old.city_id
     or new.province is distinct from old.province
     or new.address is distinct from old.address
     or new.claimed_by is distinct from old.claimed_by
     or new.verified_at is distinct from old.verified_at
     or new.source is distinct from old.source
     or new.osm_id is distinct from old.osm_id
     or new.google_place_id is distinct from old.google_place_id
     or new.created_at is distinct from old.created_at then
    raise exception 'owners can only edit description, prices, hours, contact links and photos'
      using errcode = 'insufficient_privilege';
  end if;
  -- The tier always follows the owner's latte price (admin overrides don't survive a price change).
  if new.latte_price is distinct from old.latte_price then
    -- Clearing the price keeps the current tier (published shops must have one).
    if new.latte_price is not null then
      new.price_tier := public.price_tier_for(new.latte_price);
    else
      new.price_tier := old.price_tier;
    end if;
  elsif new.price_tier is distinct from old.price_tier then
    raise exception 'owners set the latte price; the tier follows it'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

-- Runs before the tier-suggest trigger (alphabetical order: guard < suggest).
create trigger shops_guard_owner_edit
before update on public.shops
for each row execute function public.shops_guard_owner_edit();

-- ---------------------------------------------------------------------------
-- Photos and menu: owners manage rows of their own shops (even when not published).
-- ---------------------------------------------------------------------------
create policy "shop_photos: owner all" on public.shop_photos
  for all to authenticated
  using ((select public.owns_shop(shop_id)))
  with check ((select public.owns_shop(shop_id)));

create policy "menu_items: owner all" on public.menu_items
  for all to authenticated
  using ((select public.owns_shop(shop_id)))
  with check ((select public.owns_shop(shop_id)));

-- Storage: photos live under `<shop_id>/…` in shop-photos.
create policy "shop-photos: owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shop-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    and (select public.owns_shop(((storage.foldername(name))[1])::uuid))
  );
create policy "shop-photos: owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shop-photos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
    and (select public.owns_shop(((storage.foldername(name))[1])::uuid))
  );

-- ---------------------------------------------------------------------------
-- Audit log of non-admin edits.
-- ---------------------------------------------------------------------------
create table public.shop_edits (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  -- e.g. {"fields": ["hours", "latte_price"]} or {"menu": 5} or {"photos": "added"}
  changes jsonb not null default '{}'::jsonb check (jsonb_typeof(changes) = 'object'),
  created_at timestamptz not null default now()
);
create index shop_edits_created_idx on public.shop_edits (created_at desc);
create index shop_edits_shop_idx on public.shop_edits (shop_id, created_at desc);
alter table public.shop_edits enable row level security;

create policy "shop_edits: admin read" on public.shop_edits
  for select to authenticated using ((select public.is_admin()));
create policy "shop_edits: owner read own" on public.shop_edits
  for select to authenticated using (user_id = (select auth.uid()));
create policy "shop_edits: owner insert own" on public.shop_edits
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.owns_shop(shop_id)));

grant select, insert on public.shop_edits to authenticated;
grant all on public.shop_edits to service_role;

-- Log which shop fields a non-admin changed (menu/photo changes are logged by the app).
-- Not SECURITY DEFINER: current_user must stay the caller's role, and the owner's own
-- insert policy on shop_edits allows the row.
create function public.shops_log_owner_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  changed text[] := array[]::text[];
begin
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    return null;
  end if;
  if new.description is distinct from old.description then changed := array_append(changed, 'description'); end if;
  if new.latte_price is distinct from old.latte_price then changed := array_append(changed, 'latte_price'); end if;
  if new.hours is distinct from old.hours then changed := array_append(changed, 'hours'); end if;
  if new.phone is distinct from old.phone then changed := array_append(changed, 'phone'); end if;
  if new.website is distinct from old.website then changed := array_append(changed, 'website'); end if;
  if new.facebook_url is distinct from old.facebook_url then changed := array_append(changed, 'facebook_url'); end if;
  if new.instagram_url is distinct from old.instagram_url then changed := array_append(changed, 'instagram_url'); end if;
  if array_length(changed, 1) > 0 then
    insert into public.shop_edits (shop_id, user_id, changes)
    values (new.id, (select auth.uid()), jsonb_build_object('fields', to_jsonb(changed)));
  end if;
  return null;
end;
$$;

create trigger shops_log_owner_edit
after update on public.shops
for each row execute function public.shops_log_owner_edit();

-- ---------------------------------------------------------------------------
-- Admin: link an owner account to a shop by email (for claims approved before the
-- claimant had signed in). Makes the account an owner unless it is already an admin.
-- ---------------------------------------------------------------------------
create function public.admin_link_owner(p_shop_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not public.is_admin() then
    raise exception 'admins only' using errcode = 'insufficient_privilege';
  end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_user is null then
    raise exception 'no account with that email has signed in yet' using errcode = 'no_data_found';
  end if;
  update public.shops set claimed_by = v_user, verified_at = coalesce(verified_at, now())
  where id = p_shop_id;
  if not found then
    raise exception 'shop not found' using errcode = 'no_data_found';
  end if;
  update public.profiles set role = 'owner' where id = v_user and role = 'user';
  return v_user;
end;
$$;

revoke execute on function public.admin_link_owner(uuid, text) from public, anon;
grant execute on function public.admin_link_owner(uuid, text) to authenticated;

-- Remove an owner link (the profile keeps its role; admins can change it separately).
create function public.admin_unlink_owner(p_shop_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'admins only' using errcode = 'insufficient_privilege';
  end if;
  update public.shops set claimed_by = null where id = p_shop_id;
end;
$$;

revoke execute on function public.admin_unlink_owner(uuid) from public, anon;
grant execute on function public.admin_unlink_owner(uuid) to authenticated;

-- Owner email for the admin shop editor.
create function public.admin_owner_email(p_shop_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
  from public.shops s
  join auth.users u on u.id = s.claimed_by
  where s.id = p_shop_id and public.is_admin()
$$;

revoke execute on function public.admin_owner_email(uuid) from public, anon;
grant execute on function public.admin_owner_email(uuid) to authenticated;
