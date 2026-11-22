-- Deleting an account (auth.users row, as Supabase's admin API does) removes the person's data
-- and releases what they were linked to.
do $$
declare
  u uuid := '00000000-0000-0000-0000-0000000000dd';
  shop uuid := (select id from public.shops where slug = 'kapihan-ni-lola');
  photo uuid;
begin
  insert into auth.users (id, email, raw_user_meta_data) values (u, 'leaving@example.test', '{}');
  update public.profiles set role = 'owner', display_name = 'Dee' where id = u;
  update public.shops set claimed_by = u, verified_at = now() where id = shop;
  insert into public.reviews (shop_id, user_id, rating, body)
  values ((select id from public.shops where slug = 'brew-dumaguete'), u, 1, 'bye');
  insert into public.saved_shops (user_id, shop_id, kind) values (u, shop, 'favorite');
  insert into public.photo_submissions (shop_id, user_id, storage_path) values (shop, u, u || '/p.jpg');
  insert into public.shop_photos (shop_id, storage_path, credit, contributed_by)
  values (shop, shop || '/dee.jpg', 'Dee', u) returning id into photo;
  -- The app clears credits before deleting (the FK only nulls contributed_by).
  update public.shop_photos set credit = null where contributed_by = u;

  delete from auth.users where id = u;

  assert not exists (select 1 from public.profiles where id = u), 'profile gone';
  assert not exists (select 1 from public.reviews where user_id = u), 'reviews gone';
  assert (select rating_count from public.shops where slug = 'brew-dumaguete')
       = (select count(*) from public.reviews r join public.shops s on s.id = r.shop_id
          where s.slug = 'brew-dumaguete' and r.status = 'visible'), 'rating recounted';
  assert not exists (select 1 from public.saved_shops where user_id = u), 'lists gone';
  assert not exists (select 1 from public.photo_submissions where user_id = u), 'photo queue gone';
  assert (select claimed_by is null and verified_at is not null from public.shops where id = shop), 'claim released, verification kept';
  assert (select contributed_by is null and credit is null from public.shop_photos where id = photo), 'approved photo kept, anonymous';
  delete from public.shop_photos where id = photo;
  update public.shops set verified_at = null where id = shop;
  raise notice 'ok: account deletion';
end $$;
