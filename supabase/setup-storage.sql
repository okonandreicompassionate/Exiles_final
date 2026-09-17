-- ============================================================================
-- Product image uploads — paste into the Supabase SQL editor and run once.
-- Replaces pasting imgur links with uploading straight from the admin forms.
-- ============================================================================

-- Public bucket: anyone can view product photos (needed for the storefront),
-- only signed-in admins can upload/replace/delete them.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

-- Only admins have a Supabase Auth login in this app at all (customers never
-- sign up), so gating on "authenticated" is equivalent to "is an admin"
-- without needing a subquery against the admins table.
drop policy if exists "product_images_admin_upload" on storage.objects;
create policy "product_images_admin_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images');
