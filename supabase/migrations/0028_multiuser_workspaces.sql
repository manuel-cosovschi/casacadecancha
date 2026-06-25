-- Multiusuario: login por nombre de usuario + workspaces aislados por vendedor.

-- Nombre de usuario para login (sin email).
alter table public.profiles add column if not exists username text;
create unique index if not exists profiles_username_key on public.profiles (lower(username)) where username is not null;

-- Aislar datos por vendedor (workspace). Las filas existentes quedan del dueño.
alter table public.encargos          add column if not exists seller_id uuid;
alter table public.supplier_orders   add column if not exists seller_id uuid;
alter table public.gifts             add column if not exists seller_id uuid;
alter table public.stock_adjustments add column if not exists seller_id uuid;

create index if not exists encargos_seller_idx on public.encargos(seller_id);
create index if not exists supplier_orders_seller_idx on public.supplier_orders(seller_id);
create index if not exists gifts_seller_idx on public.gifts(seller_id);
create index if not exists stock_adjustments_seller_idx on public.stock_adjustments(seller_id);

-- Resolver el email a partir del usuario (para el login por usuario).
create or replace function public.auth_email_for_username(p_username text)
returns text language sql security definer set search_path = public as $$
  select email from public.profiles where lower(username) = lower(p_username) and active limit 1;
$$;
grant execute on function public.auth_email_for_username(text) to anon, authenticated;
