-- Owner insights: anonymous daily counters per shop (no visitor ids, IPs or cookies stored).
-- The browser reports events through track_shop_event(); owners and admins read summaries
-- through shop_insights(). Nobody else can read the counters.

create table public.shop_daily_stats (
  shop_id uuid not null references public.shops (id) on delete cascade,
  day date not null,
  views int not null default 0,       -- shop page opened
  map_opens int not null default 0,   -- shop selected on the map
  directions int not null default 0,  -- "Directions" tapped
  contacts int not null default 0,    -- phone, website or social link tapped
  primary key (shop_id, day)
);
create index shop_daily_stats_day_idx on public.shop_daily_stats (day);
alter table public.shop_daily_stats enable row level security;
-- Default privileges would grant anon/authenticated everything; writes go through the function.
revoke all on public.shop_daily_stats from anon, authenticated;
grant select on public.shop_daily_stats to authenticated;
grant all on public.shop_daily_stats to service_role;

create policy "shop_daily_stats: owner read" on public.shop_daily_stats
  for select to authenticated using ((select public.owns_shop(shop_id)));
create policy "shop_daily_stats: admin read" on public.shop_daily_stats
  for select to authenticated using ((select public.is_admin()));

-- Count one event for a published shop, on today's date in Philippine time.
create function public.track_shop_event(p_slug text, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid;
  v_day date := (now() at time zone 'Asia/Manila')::date;
begin
  if p_kind not in ('view', 'map', 'directions', 'contact') then
    return;
  end if;
  select id into v_shop from public.shops where slug = p_slug and status = 'published';
  if v_shop is null then
    return;
  end if;
  insert into public.shop_daily_stats as s (shop_id, day, views, map_opens, directions, contacts)
  values (
    v_shop, v_day,
    (p_kind = 'view')::int, (p_kind = 'map')::int, (p_kind = 'directions')::int, (p_kind = 'contact')::int
  )
  on conflict (shop_id, day) do update set
    views = s.views + excluded.views,
    map_opens = s.map_opens + excluded.map_opens,
    directions = s.directions + excluded.directions,
    contacts = s.contacts + excluded.contacts;
end;
$$;
revoke all on function public.track_shop_event(text, text) from public;
grant execute on function public.track_shop_event(text, text) to anon, authenticated;

-- Summary for one shop over the last p_days days (owner of that shop or admin only):
-- daily series plus favorites / "been here" totals, which are otherwise private per user.
create function public.shop_insights(p_shop_id uuid, p_days int default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 7), 90);
  v_today date := (now() at time zone 'Asia/Manila')::date;
  v_from date := v_today - (v_days - 1);
begin
  if not (public.is_admin() or public.owns_shop(p_shop_id)) then
    raise exception 'not allowed' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'days', v_days,
    'from', v_from,
    'to', v_today,
    'series', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', d::date,
        'views', coalesce(s.views, 0),
        'map', coalesce(s.map_opens, 0),
        'directions', coalesce(s.directions, 0),
        'contacts', coalesce(s.contacts, 0)
      ) order by d)
      from generate_series(v_from, v_today, interval '1 day') d
      left join public.shop_daily_stats s on s.shop_id = p_shop_id and s.day = d::date
    ), '[]'::jsonb),
    'previous', (
      select jsonb_build_object(
        'views', coalesce(sum(views), 0),
        'map', coalesce(sum(map_opens), 0),
        'directions', coalesce(sum(directions), 0),
        'contacts', coalesce(sum(contacts), 0)
      )
      from public.shop_daily_stats
      where shop_id = p_shop_id and day >= v_from - v_days and day < v_from
    ),
    'favorites', (select count(*) from public.saved_shops where shop_id = p_shop_id and kind = 'favorite'),
    'visited', (select count(*) from public.saved_shops where shop_id = p_shop_id and kind = 'visited')
  );
end;
$$;
revoke all on function public.shop_insights(uuid, int) from public;
grant execute on function public.shop_insights(uuid, int) to authenticated;
