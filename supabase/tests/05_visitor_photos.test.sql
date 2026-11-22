-- Visitor photos (migration 20261122000005).
create or replace function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
  set role authenticated;
end $$;

-- Visitor C uploads.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
declare
  shop uuid := (select id from public.shops where slug = 'brew-dumaguete');
  me text := '00000000-0000-0000-0000-00000000000c';
  n int;
begin
  insert into storage.objects (bucket_id, name) values ('photo-submissions', me || '/a.jpg');
  begin
    insert into storage.objects (bucket_id, name) values ('photo-submissions', '00000000-0000-0000-0000-00000000000b/x.jpg');
    raise exception 'uploaded into another folder';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('shop-photos', shop || '/x.jpg');
    raise exception 'visitor wrote to public bucket';
  exception when insufficient_privilege then null;
  end;

  insert into public.photo_submissions (shop_id, storage_path, caption) values (shop, me || '/a.jpg', 'Latte art');
  assert (select user_id::text from public.photo_submissions where storage_path = me || '/a.jpg') = me, 'user_id defaults to me';

  begin
    insert into public.photo_submissions (shop_id, storage_path, status) values (shop, me || '/b.jpg', 'approved');
    raise exception 'self-approved';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.photo_submissions (shop_id, storage_path) values (shop, '00000000-0000-0000-0000-00000000000b/b.jpg');
    raise exception 'path outside own folder';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.photo_submissions (shop_id, storage_path)
    values ((select id from public.shops where slug = 'secret-draft'), me || '/c.jpg');
    raise exception 'photo of unpublished shop';
  exception when insufficient_privilege then null;
  end;

  update public.photo_submissions set status = 'approved' where storage_path = me || '/a.jpg';
  get diagnostics n = row_count;
  assert n = 0, 'cannot approve own photo';
  raise notice 'ok: visitor photo upload rules';
end $$;
reset role;

-- Others can't see it; anon can't see anything.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
do $$
begin
  assert (select count(*) from public.photo_submissions) = 0, 'other users see nothing';
  assert (select count(*) from storage.objects where bucket_id = 'photo-submissions') = 0, 'other users read no files';
end $$;
reset role;
set role anon;
do $$
begin
  assert (select count(*) from public.photo_submissions) = 0, 'anon sees nothing';
end $$;
reset role;

-- Admin approves: copies into shop-photos with credit.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
do $$
declare
  sub public.photo_submissions;
  pid uuid;
begin
  select * into sub from public.photo_submissions where status = 'pending' limit 1;
  assert sub.id is not null, 'admin sees the queue';
  assert (select count(*) from storage.objects where bucket_id = 'photo-submissions') = 1, 'admin reads the file';
  insert into public.shop_photos (shop_id, storage_path, caption, credit, contributed_by)
  values (sub.shop_id, sub.shop_id || '/v.jpg', sub.caption, 'Carla', sub.user_id)
  returning id into pid;
  update public.photo_submissions set status = 'approved', photo_id = pid, reviewed_by = auth.uid(), reviewed_at = now()
  where id = sub.id;
  delete from storage.objects where bucket_id = 'photo-submissions' and name = sub.storage_path;
  assert (select credit from public.shop_photos where id = pid) = 'Carla', 'credit stored';
  raise notice 'ok: admin approval';
end $$;
reset role;

-- Visitor can delete only pending rows; daily limit.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
do $$
declare
  shop uuid := (select id from public.shops where slug = 'brew-dumaguete');
  me text := '00000000-0000-0000-0000-00000000000c';
  n int;
begin
  delete from public.photo_submissions where status = 'approved';
  get diagnostics n = row_count;
  assert n = 0, 'approved rows stay';
  for i in 1..19 loop
    insert into public.photo_submissions (shop_id, storage_path) values (shop, me || '/l' || i || '.jpg');
  end loop;
  begin
    insert into public.photo_submissions (shop_id, storage_path) values (shop, me || '/l20.jpg');
    raise exception 'limit not enforced';
  exception when check_violation then null;
  end;
  delete from public.photo_submissions where status = 'pending';
  get diagnostics n = row_count;
  assert n = 19, 'own pending rows deletable';
  raise notice 'ok: visitor photo limits';
end $$;
reset role;
delete from public.photo_submissions;
