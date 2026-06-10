-- =====================================================================
-- CASACA DE CANCHA - Endurecimiento de seguridad (advisors de Supabase)
-- =====================================================================

-- 1. La vista de stock aplica RLS del consumidor, no del creador.
alter view public.variant_stock set (security_invoker = on);

-- 2. search_path fijo en el trigger de updated_at.
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- 3. Funciones internas no expuestas a la API pública.
revoke all on function public.handle_new_user() from anon, authenticated, public;
revoke all on function public.increment_promotion_use(text) from anon, authenticated, public;

-- 4. Lectura de Storage acotada al prefijo de productos.
drop policy if exists "Public read product-images" on storage.objects;
create policy "Public read product-images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = 'products');
