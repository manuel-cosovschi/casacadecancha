-- =====================================================================
-- CASACA DE CANCHA - Esquema de base de datos (PostgreSQL / Supabase)
-- =====================================================================
-- Ejecutar en el SQL Editor de Supabase o vía `supabase db push`.
-- Orden: 0001_schema.sql -> 0002_rls.sql -> 0003_seed.sql
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('owner', 'admin', 'operator', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('transfer', 'mercadopago', 'cash', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending_payment', 'payment_review', 'paid', 'refunded', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('new', 'preparing', 'ready', 'shipped', 'delivered', 'cancelled', 'returned', 'exchanged');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sales_channel as enum ('web', 'whatsapp', 'instagram', 'facebook', 'local', 'referido', 'familia', 'otro');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- PROFILES (administradores) - vinculado a auth.users
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique,
  role user_role not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  price numeric(12,2) not null default 0,
  compare_at_price numeric(12,2),
  unit_cost numeric(12,2) not null default 0,
  packaging_cost numeric(12,2) not null default 0,
  category_id uuid references public.categories(id) on delete set null,
  material text,
  fabric text,
  care text,
  badge text,
  active boolean not null default true,
  featured boolean not null default false,
  allow_backorder boolean not null default false,
  hide_when_out_of_stock boolean not null default false,
  sort_order int not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_active on public.products(active);
create index if not exists idx_products_category on public.products(category_id);

-- ---------------------------------------------------------------------
-- PRODUCT VARIANTS
-- ---------------------------------------------------------------------
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text,
  color text,
  model text,
  sku text,
  stock_physical int not null default 0,
  stock_reserved int not null default 0,
  stock_minimum int not null default 0,
  variant_cost numeric(12,2),
  variant_price numeric(12,2),
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_variants_product on public.product_variants(product_id);

-- ---------------------------------------------------------------------
-- PRODUCT IMAGES
-- ---------------------------------------------------------------------
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order int not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_images_product on public.product_images(product_id);

-- ---------------------------------------------------------------------
-- COLLECTIONS
-- ---------------------------------------------------------------------
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.collection_products (
  collection_id uuid not null references public.collections(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sort_order int not null default 0,
  primary key (collection_id, product_id)
);

-- ---------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  phone text,
  email text,
  dni text,
  province text,
  city text,
  postal_code text,
  address text,
  source sales_channel default 'web',
  segment text,
  notes text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);
create index if not exists idx_customers_phone on public.customers(phone);

-- ---------------------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------------------
create sequence if not exists order_number_seq start 1000;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('CDC-' || nextval('order_number_seq')::text),
  customer_id uuid references public.customers(id) on delete set null,
  subtotal numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  shipping_cost numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  estimated_cost numeric(12,2) not null default 0,
  payment_method payment_method not null default 'transfer',
  payment_status payment_status not null default 'pending_payment',
  order_status order_status not null default 'new',
  shipping_method text,
  tracking_code text,
  carrier text,
  channel sales_channel not null default 'web',
  -- snapshot del cliente (por si se borra el registro)
  customer_name text,
  customer_phone text,
  customer_email text,
  province text,
  city text,
  address text,
  postal_code text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text,
  referrer text,
  landing_page text,
  device text,
  notes text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_created on public.orders(created_at);
create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_status on public.orders(order_status);

-- ---------------------------------------------------------------------
-- ORDER ITEMS
-- ---------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text,
  size text,
  quantity int not null default 1,
  unit_price numeric(12,2) not null default 0,
  unit_cost numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0
);
create index if not exists idx_order_items_order on public.order_items(order_id);

-- ---------------------------------------------------------------------
-- PAYMENTS
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  method payment_method not null,
  amount numeric(12,2) not null default 0,
  status payment_status not null default 'pending_payment',
  payment_reference text,
  proof_url text,
  external_payment_id text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- EXPENSES
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  category text not null,
  description text,
  amount numeric(12,2) not null default 0,
  related_product_id uuid references public.products(id) on delete set null,
  related_campaign text,
  recurring boolean not null default false,
  proof_url text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- PROMOTIONS
-- ---------------------------------------------------------------------
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'percentage', -- percentage | fixed | coupon | bundle | free_shipping
  percentage numeric(6,2),
  fixed_amount numeric(12,2),
  code text,
  start_date timestamptz,
  end_date timestamptz,
  active boolean not null default true,
  minimum_amount numeric(12,2),
  max_uses int,
  uses_per_customer int,
  used_count int not null default 0,
  configuration_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- STORE SETTINGS (clave/valor)
-- ---------------------------------------------------------------------
create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- SIZE GUIDES
-- ---------------------------------------------------------------------
create table if not exists public.size_guides (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  audience text not null default 'adultos',
  measurements_json jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------
-- FAQS
-- ---------------------------------------------------------------------
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  active boolean not null default true,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------
-- INVENTORY MOVEMENTS
-- ---------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references public.product_variants(id) on delete set null,
  type text not null, -- ingreso | venta | cancelacion | cambio | devolucion | ajuste | reserva | liberacion
  quantity int not null default 0,
  reason text,
  related_order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_movements_variant on public.inventory_movements(variant_id);

-- ---------------------------------------------------------------------
-- AD METRICS (Meta Ads / atribución)
-- ---------------------------------------------------------------------
create table if not exists public.ad_metrics (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  campaign text,
  adset text,
  ad text,
  creative text,
  spend numeric(12,2) not null default 0,
  impressions int not null default 0,
  reach int not null default 0,
  clicks int not null default 0,
  ctr numeric(8,4),
  cpm numeric(12,2),
  cpc numeric(12,2),
  landing_views int not null default 0,
  add_to_cart int not null default 0,
  checkout int not null default 0,
  purchases int not null default 0,
  revenue numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ACTIVITY LOGS
-- ---------------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Vista de stock disponible
-- ---------------------------------------------------------------------
create or replace view public.variant_stock as
select
  v.id as variant_id,
  v.product_id,
  v.size,
  v.stock_physical,
  v.stock_reserved,
  (v.stock_physical - v.stock_reserved) as stock_available,
  v.stock_minimum,
  (v.stock_physical - v.stock_reserved) <= v.stock_minimum as low_stock
from public.product_variants v;

-- ---------------------------------------------------------------------
-- Trigger: updated_at
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_orders_updated on public.orders;
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Trigger: crear profile al registrarse un usuario en Auth
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    -- el primer usuario es owner; el resto viewer
    case when (select count(*) from public.profiles) = 0 then 'owner'::user_role else 'viewer'::user_role end
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
