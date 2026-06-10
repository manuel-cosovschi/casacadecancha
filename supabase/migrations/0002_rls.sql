-- =====================================================================
-- CASACA DE CANCHA - Row Level Security
-- =====================================================================
-- Estrategia:
--  * El storefront público sólo LEE catálogo activo (anon).
--  * Las escrituras de catálogo/pedidos/ajustes las hace el servidor con
--    la SERVICE ROLE KEY (que ignora RLS). Las server actions validan
--    la lógica de negocio antes de escribir.
--  * Los administradores autenticados pueden leer todo desde el dashboard.
-- =====================================================================

-- Helper: ¿el usuario actual es admin activo?
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true
      and p.role in ('owner','admin','operator','viewer')
  );
$$;

create or replace function public.is_staff_writer()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true
      and p.role in ('owner','admin','operator')
  );
$$;

-- Activar RLS en todas las tablas
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_variants    enable row level security;
alter table public.product_images      enable row level security;
alter table public.collections         enable row level security;
alter table public.collection_products enable row level security;
alter table public.customers           enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.payments            enable row level security;
alter table public.expenses            enable row level security;
alter table public.promotions          enable row level security;
alter table public.store_settings      enable row level security;
alter table public.size_guides         enable row level security;
alter table public.faqs                enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.ad_metrics          enable row level security;
alter table public.activity_logs       enable row level security;

-- =====================================================================
-- Lectura pública (anon) del catálogo activo y contenido del sitio
-- =====================================================================
drop policy if exists pub_read_categories on public.categories;
create policy pub_read_categories on public.categories for select using (active = true);

drop policy if exists pub_read_products on public.products;
create policy pub_read_products on public.products for select using (active = true);

drop policy if exists pub_read_variants on public.product_variants;
create policy pub_read_variants on public.product_variants for select using (active = true);

drop policy if exists pub_read_images on public.product_images;
create policy pub_read_images on public.product_images for select using (true);

drop policy if exists pub_read_collections on public.collections;
create policy pub_read_collections on public.collections for select using (active = true);

drop policy if exists pub_read_collection_products on public.collection_products;
create policy pub_read_collection_products on public.collection_products for select using (true);

drop policy if exists pub_read_settings on public.store_settings;
create policy pub_read_settings on public.store_settings for select using (true);

drop policy if exists pub_read_size_guides on public.size_guides;
create policy pub_read_size_guides on public.size_guides for select using (active = true);

drop policy if exists pub_read_faqs on public.faqs;
create policy pub_read_faqs on public.faqs for select using (active = true);

drop policy if exists pub_read_promotions on public.promotions;
create policy pub_read_promotions on public.promotions for select using (active = true);

-- =====================================================================
-- Lectura para administradores autenticados (todo)
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','categories','products','product_variants','product_images',
    'collections','collection_products','customers','orders','order_items',
    'payments','expenses','promotions','store_settings','size_guides','faqs',
    'inventory_movements','ad_metrics','activity_logs'
  ] loop
    execute format('drop policy if exists admin_read_%1$s on public.%1$s;', t);
    execute format('create policy admin_read_%1$s on public.%1$s for select using (public.is_admin());', t);
  end loop;
end $$;

-- Profiles: cada usuario puede ver/editar su propio registro
drop policy if exists own_profile_select on public.profiles;
create policy own_profile_select on public.profiles for select using (id = auth.uid());

-- Escrituras de catálogo/contenido para staff con permisos
do $$
declare t text;
begin
  foreach t in array array[
    'categories','products','product_variants','product_images',
    'collections','collection_products','store_settings','size_guides','faqs',
    'promotions','expenses','ad_metrics','customers'
  ] loop
    execute format('drop policy if exists staff_write_%1$s on public.%1$s;', t);
    execute format('create policy staff_write_%1$s on public.%1$s for all using (public.is_staff_writer()) with check (public.is_staff_writer());', t);
  end loop;
end $$;

-- NOTA: orders, order_items, payments, inventory_movements y activity_logs
-- se escriben desde el servidor con SERVICE ROLE (bypassea RLS). Para
-- permitir gestión manual desde el dashboard, habilitamos staff writers:
do $$
declare t text;
begin
  foreach t in array array['orders','order_items','payments','inventory_movements','activity_logs'] loop
    execute format('drop policy if exists staff_write_%1$s on public.%1$s;', t);
    execute format('create policy staff_write_%1$s on public.%1$s for all using (public.is_staff_writer()) with check (public.is_staff_writer());', t);
  end loop;
end $$;
