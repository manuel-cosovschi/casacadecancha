-- =====================================================================
-- CASACA DE CANCHA — Descuento de bienvenida (10% en la primera compra)
--
-- El storefront no puede leer `orders` (RLS: solo is_admin), así que para
-- saber si un email ya compró hace falta una función SECURITY DEFINER que
-- devuelva SOLO la cantidad de pedidos, sin exponer ningún dato del pedido.
--
-- Hasta que esta migración se aplique, el código rechaza el cupón de
-- bienvenida en vez de regalarlo: falla cerrado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Suscriptores del popup
-- No hace falta marcar "canjeado": el pedido ya guarda `coupon_code`, así que
-- el uso del descuento se rastrea desde `orders`.
-- ---------------------------------------------------------------------
create table if not exists public.welcome_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  source text default 'popup',
  created_at timestamptz not null default now()
);

-- Un alta por email: si vuelve a cargarse, se actualiza el nombre.
create unique index if not exists welcome_signups_email_key
  on public.welcome_signups (lower(email));

alter table public.welcome_signups enable row level security;

-- Nadie lee esta tabla con la anon key. El alta va por la RPC de abajo y la
-- lectura queda para el admin.
drop policy if exists admin_read_welcome_signups on public.welcome_signups;
create policy admin_read_welcome_signups on public.welcome_signups
  for select using (public.is_admin());

drop policy if exists staff_write_welcome_signups on public.welcome_signups;
create policy staff_write_welcome_signups on public.welcome_signups
  for all using (public.is_staff_writer()) with check (public.is_staff_writer());

-- ---------------------------------------------------------------------
-- Alta desde el popup
-- ---------------------------------------------------------------------
-- Devuelve si ese email califica para el descuento (no compró nunca).
-- No expone nada del historial: solo un booleano y el conteo.
create or replace function public.welcome_subscribe(p_email text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email  text := lower(trim(p_email));
  v_name   text := trim(p_name);
  v_orders int;
begin
  if v_email is null or v_email = '' or position('@' in v_email) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'email_invalido');
  end if;
  if v_name is null or length(v_name) < 3 then
    return jsonb_build_object('ok', false, 'reason', 'nombre_invalido');
  end if;

  insert into public.welcome_signups (email, name)
  values (v_email, v_name)
  on conflict (lower(email)) do update set name = excluded.name;

  select count(*) into v_orders
    from public.orders
   where lower(customer_email) = v_email;

  return jsonb_build_object(
    'ok', true,
    'eligible', v_orders = 0,
    'orders', v_orders
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Verificación al aplicar el cupón / crear el pedido
-- ---------------------------------------------------------------------
-- Cuántos pedidos tiene ese email. Es lo único que necesita el checkout para
-- decidir si es la primera compra; no devuelve ningún dato del cliente.
create or replace function public.orders_count_for_email(p_email text)
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
    from public.orders
   where lower(customer_email) = lower(trim(p_email));
$$;

-- ---------------------------------------------------------------------
-- Permisos: solo lo mínimo, y nada de la tabla directo.
-- ---------------------------------------------------------------------
grant execute on function public.welcome_subscribe(text, text)      to anon, authenticated;
grant execute on function public.orders_count_for_email(text)       to anon, authenticated;
