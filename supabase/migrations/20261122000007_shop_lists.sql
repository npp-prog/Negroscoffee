-- Curated coffee lists ("Best kapihan in Bacolod"), made by admins, public once published.

create table public.shop_lists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(title) between 2 and 100),
  description text check (char_length(description) <= 600),
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index shop_lists_public_idx on public.shop_lists (status, sort_order, published_at desc);

create table public.shop_list_items (
  list_id uuid not null references public.shop_lists (id) on delete cascade,
  shop_id uuid not null references public.shops (id) on delete cascade,
  position int not null default 0,
  note text check (char_length(note) <= 240),
  primary key (list_id, shop_id)
);
create index shop_list_items_shop_idx on public.shop_list_items (shop_id);

alter table public.shop_lists enable row level security;
alter table public.shop_list_items enable row level security;
grant select on public.shop_lists, public.shop_list_items to anon, authenticated;
grant insert, update, delete on public.shop_lists, public.shop_list_items to authenticated;
grant all on public.shop_lists, public.shop_list_items to service_role;

create policy "shop_lists: public read published" on public.shop_lists
  for select to anon, authenticated using (status = 'published');
create policy "shop_lists: admin all" on public.shop_lists
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "shop_list_items: public read published" on public.shop_list_items
  for select to anon, authenticated
  using (exists (select 1 from public.shop_lists l where l.id = list_id and l.status = 'published'));
create policy "shop_list_items: admin all" on public.shop_list_items
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- updated_at, and published_at the first time a list goes live.
create function public.shop_lists_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

create trigger shop_lists_touch
before insert or update on public.shop_lists
for each row execute function public.shop_lists_touch();
