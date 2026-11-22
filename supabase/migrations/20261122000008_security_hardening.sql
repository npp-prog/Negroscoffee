-- Security hardening after the site health review.

-- 1. Owners could set their own star rating (rating_avg / rating_count were added after the
--    guard). Lock them, plus published_at. The rating trigger is SECURITY DEFINER, so it still works.
create or replace function public.shops_guard_owner_edit()
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
     or new.created_at is distinct from old.created_at
     or new.rating_avg is distinct from old.rating_avg
     or new.rating_count is distinct from old.rating_count
     or new.published_at is distinct from old.published_at then
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

-- 2. Authors could delete a review an admin hid and post it again as visible. Hidden reviews now
--    stay put (admins can still delete them).
drop policy "reviews: author delete" on public.reviews;
create policy "reviews: author delete" on public.reviews
  for delete to authenticated using (user_id = (select auth.uid()) and status = 'visible');

-- 3. Owners could forge "Photo by" credits or point a photo row at another shop's file.
create function public.shop_photos_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;
  if split_part(new.storage_path, '/', 1) <> new.shop_id::text then
    raise exception 'photo files must live in the shop''s own folder'
      using errcode = 'insufficient_privilege';
  end if;
  if tg_op = 'INSERT' then
    new.credit := null;
    new.contributed_by := null;
  else
    new.credit := old.credit;
    new.contributed_by := old.contributed_by;
  end if;
  return new;
end;
$$;

create trigger shop_photos_guard
before insert or update on public.shop_photos
for each row execute function public.shop_photos_guard();

-- 4. Spam brake for suggestions, edits and claims (each emails the admins): at most 10 per hour
--    per signed-in person, and 30 per hour from all signed-out visitors together.
create function public.submissions_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  -- SECURITY DEFINER: current_user is the owner here, so read the API role from the request.
  v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> 'role';
begin
  if v_role is null or v_role not in ('anon', 'authenticated') or public.is_admin() then
    return new;
  end if;
  if v_uid is not null then
    if (select count(*) from public.submissions
        where submitter_id = v_uid and created_at > now() - interval '1 hour') >= 10 then
      raise exception 'submission_limit: too many submissions, try again later'
        using errcode = 'check_violation';
    end if;
  elsif (select count(*) from public.submissions
         where submitter_id is null and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'submission_limit: too many submissions, try again later'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger submissions_rate_limit
before insert on public.submissions
for each row execute function public.submissions_rate_limit();

-- 5. Indexes for owner lookups and per-shop save counts (owner insights).
create index if not exists shops_claimed_by_idx on public.shops (claimed_by) where claimed_by is not null;
create index if not exists saved_shops_shop_idx on public.saved_shops (shop_id, kind);

-- 6. Replace a menu or a list's shops in one transaction (was delete-then-insert from the app,
--    which could leave a menu empty or a list published with no shops if the insert failed).
--    SECURITY INVOKER: RLS decides who may do it, exactly as for the separate statements.
create function public.replace_menu(p_shop_id uuid, p_items jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.menu_items where shop_id = p_shop_id;
  insert into public.menu_items (shop_id, name, price, category, sort_order)
  select p_shop_id, e ->> 'name', (e ->> 'price')::numeric, nullif(e ->> 'category', ''), (n - 1)::int
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as t(e, n);
end;
$$;
revoke all on function public.replace_menu(uuid, jsonb) from public;
grant execute on function public.replace_menu(uuid, jsonb) to authenticated, service_role;

create function public.replace_list_items(p_list_id uuid, p_items jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.shop_list_items where list_id = p_list_id;
  insert into public.shop_list_items (list_id, shop_id, position, note)
  select p_list_id, (e ->> 'shop_id')::uuid, (n - 1)::int, nullif(e ->> 'note', '')
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as t(e, n);
end;
$$;
revoke all on function public.replace_list_items(uuid, jsonb) from public;
grant execute on function public.replace_list_items(uuid, jsonb) to authenticated, service_role;

-- 7. "Most viewed" totals computed in SQL (the app used to fetch every daily row, which hits the
--    API's 1000-row cap as shops grow). SECURITY INVOKER: RLS limits non-admins to their shops.
create function public.top_shops(p_days int default 7, p_limit int default 5)
returns table (shop_id uuid, name text, slug text, views bigint, directions bigint)
language sql
stable
set search_path = ''
as $$
  select s.shop_id, p.name, p.slug, sum(s.views + s.map_opens), sum(s.directions)
  from public.shop_daily_stats s
  join public.shops p on p.id = s.shop_id
  where s.day >= (now() at time zone 'Asia/Manila')::date - (least(greatest(coalesce(p_days, 7), 1), 90) - 1)
  group by s.shop_id, p.name, p.slug
  order by 4 desc, 5 desc, p.name
  limit least(greatest(coalesce(p_limit, 5), 1), 50);
$$;
revoke all on function public.top_shops(int, int) from public;
grant execute on function public.top_shops(int, int) to authenticated, service_role;
