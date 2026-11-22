-- Visitor photos. Signed-in visitors upload photos of published shops into the private
-- `photo-submissions` bucket (under `<their user id>/…`) with a row in photo_submissions.
-- An admin approves: the app copies the file into `shop-photos`, adds a shop_photos row with a
-- credit line, and marks the submission approved. Nothing is public before approval.

-- Credit for photos that came from visitors ("Photo by Carla").
alter table public.shop_photos
  add column credit text check (char_length(credit) <= 80),
  add column contributed_by uuid references public.profiles (id) on delete set null;

create table public.photo_submissions (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  storage_path text not null unique, -- inside photo-submissions: <user_id>/<uuid>.<ext>
  caption text check (char_length(caption) <= 200),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  photo_id uuid references public.shop_photos (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index photo_submissions_queue_idx on public.photo_submissions (status, created_at);
create index photo_submissions_user_idx on public.photo_submissions (user_id, created_at desc);
alter table public.photo_submissions enable row level security;
grant select, insert, update, delete on public.photo_submissions to authenticated;
grant all on public.photo_submissions to service_role;

-- Visitors add pending photos of published shops, inside their own storage folder.
create policy "photo_submissions: user insert" on public.photo_submissions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
    and photo_id is null
    and reviewed_by is null
    and reviewed_at is null
    and split_part(storage_path, '/', 1) = (select auth.uid())::text
    and exists (select 1 from public.shops s where s.id = shop_id and s.status = 'published')
  );
create policy "photo_submissions: user read own" on public.photo_submissions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "photo_submissions: user delete own pending" on public.photo_submissions
  for delete to authenticated using (user_id = (select auth.uid()) and status = 'pending');
create policy "photo_submissions: admin all" on public.photo_submissions
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Spam brake: at most 20 photos per person per day.
create function public.photo_submissions_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.photo_submissions
    where user_id = new.user_id and created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'photo_limit: at most 20 photos per day' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger photo_submissions_limit
before insert on public.photo_submissions
for each row execute function public.photo_submissions_limit();

-- Private bucket for photos waiting for review.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photo-submissions', 'photo-submissions', false, 5 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "photo-submissions: user insert own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photo-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "photo-submissions: user or admin read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photo-submissions'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );
create policy "photo-submissions: user or admin delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photo-submissions'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );
