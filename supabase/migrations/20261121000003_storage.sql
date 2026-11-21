-- Storage buckets.
--   shop-photos        public read; admins upload/replace/delete.
--   submission-proofs  private; anyone may upload a proof photo under `claims/`; admins read.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('shop-photos', 'shop-photos', true, 8 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('submission-proofs', 'submission-proofs', false, 8 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "shop-photos: public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'shop-photos');
create policy "shop-photos: admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'shop-photos' and (select public.is_admin()));
create policy "shop-photos: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'shop-photos' and (select public.is_admin()));
create policy "shop-photos: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'shop-photos' and (select public.is_admin()));

create policy "submission-proofs: anyone upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'submission-proofs' and (storage.foldername(name))[1] in ('claims', 'suggestions'));
create policy "submission-proofs: admin read" on storage.objects
  for select to authenticated using (bucket_id = 'submission-proofs' and (select public.is_admin()));
create policy "submission-proofs: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'submission-proofs' and (select public.is_admin()));
