-- =====================================================================
-- CASACA DE CANCHA - Storage (fotografías de productos)
-- =====================================================================
-- Crea el bucket público "product-images" y sus políticas.
-- Las subidas se hacen desde el servidor con SERVICE ROLE (bypassa RLS),
-- por lo que sólo necesitamos lectura pública.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Lectura pública de las imágenes.
drop policy if exists "Public read product-images" on storage.objects;
create policy "Public read product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Escritura para administradores autenticados (además del service role).
drop policy if exists "Staff write product-images" on storage.objects;
create policy "Staff write product-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_staff_writer());

drop policy if exists "Staff update product-images" on storage.objects;
create policy "Staff update product-images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_staff_writer());

drop policy if exists "Staff delete product-images" on storage.objects;
create policy "Staff delete product-images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_staff_writer());
