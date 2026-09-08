-- =====================================================================
-- CASACA DE CANCHA — Cuentas de cliente + programa de fidelidad
--
-- PARTE 1 (SEGURIDAD) — corregir antes que nada.
-- PARTE 2 — el programa de puntos.
--
-- La parte 1 NO es opcional: sin ella, habilitar cuentas de cliente le da a
-- cualquiera lectura de todos los pedidos y datos personales.
-- =====================================================================


-- =====================================================================
-- PARTE 1 — Separar clientes de staff
--
-- Hoy `handle_new_user()` le pone rol 'viewer' a todo usuario nuevo, y
-- `is_admin()` incluye 'viewer', que habilita SELECT sobre orders, customers,
-- payments y expenses. Con el registro público abierto, eso alcanza para que
-- cualquiera lea toda la base.
--
-- Se agrega un rol 'customer' que no está en ninguna de las dos funciones de
-- permisos, y pasa a ser el rol por defecto de quien se registra.
-- =====================================================================

alter type user_role add value if not exists 'customer';

-- Los usuarios que ya existen y no son staff real pasan a 'customer'.
-- Ajustá la lista si algún viewer es staff de verdad.
-- update public.profiles set role = 'customer'
--  where role = 'viewer' and email not in ('...staff...');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case
      -- El primer usuario del sistema es el dueño.
      when (select count(*) from public.profiles) = 0 then 'owner'::user_role
      -- Todo registro nuevo es cliente. El staff se promueve a mano desde el
      -- panel: nadie gana permisos por registrarse solo.
      else 'customer'::user_role
    end
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- `is_admin()` e `is_staff_writer()` enumeran roles explícitamente, así que
-- 'customer' queda afuera de las dos sin tocarlas. Se redefinen igual para
-- dejarlo escrito y que no se pierda en una lectura futura.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true
      and p.role in ('owner','admin','operator','viewer')  -- 'customer' NO
  );
$$;


-- =====================================================================
-- PARTE 2 — Fidelidad
--
-- Reglas (compras que superan el umbral, medido sobre el SUBTOTAL del pedido
-- antes de descuentos, para que usar un cupón no descalifique la compra
-- siguiente ni se pueda inflar el nivel a fuerza de descuentos):
--
--   1 compra   -> 10%
--   2 compras  -> 15%
--   3 o más    -> 20%  (tope)
-- =====================================================================

create table if not exists public.loyalty_config (
  id                boolean primary key default true check (id),
  min_order_amount  numeric not null default 100000,
  tier1_orders      int not null default 1,  tier1_percent int not null default 10,
  tier2_orders      int not null default 2,  tier2_percent int not null default 15,
  tier3_orders      int not null default 3,  tier3_percent int not null default 20,
  active            boolean not null default true
);
insert into public.loyalty_config (id) values (true) on conflict (id) do nothing;

alter table public.loyalty_config enable row level security;

drop policy if exists pub_read_loyalty_config on public.loyalty_config;
create policy pub_read_loyalty_config on public.loyalty_config for select using (true);

drop policy if exists staff_write_loyalty_config on public.loyalty_config;
create policy staff_write_loyalty_config on public.loyalty_config
  for all using (public.is_staff_writer()) with check (public.is_staff_writer());

-- ---------------------------------------------------------------------
-- Estado de fidelidad del usuario logueado
-- ---------------------------------------------------------------------
-- Solo mira los pedidos del PROPIO usuario (por su email de cuenta) y devuelve
-- el conteo y el porcentaje. No expone ningún dato de ningún pedido.
create or replace function public.loyalty_status()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_email   text;
  v_cfg     public.loyalty_config%rowtype;
  v_count   int;
  v_percent int := 0;
begin
  select email into v_email from public.profiles where id = auth.uid();
  if v_email is null then
    return jsonb_build_object('ok', false, 'reason', 'sin_sesion');
  end if;

  select * into v_cfg from public.loyalty_config where id = true;
  if not found or not v_cfg.active then
    return jsonb_build_object('ok', true, 'orders', 0, 'percent', 0, 'email', v_email);
  end if;

  select count(*)::int into v_count
    from public.orders o
   where lower(o.customer_email) = lower(v_email)
     and o.subtotal >= v_cfg.min_order_amount;

  if    v_count >= v_cfg.tier3_orders then v_percent := v_cfg.tier3_percent;
  elsif v_count >= v_cfg.tier2_orders then v_percent := v_cfg.tier2_percent;
  elsif v_count >= v_cfg.tier1_orders then v_percent := v_cfg.tier1_percent;
  end if;

  return jsonb_build_object(
    'ok', true,
    'orders', v_count,
    'percent', v_percent,
    'email', v_email,
    'min_amount', v_cfg.min_order_amount
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Verificación al aplicar el cupón de fidelidad en el checkout
-- ---------------------------------------------------------------------
-- El checkout corre sin sesión del cliente, así que no puede usar auth.uid().
-- Esta función responde por email: cuántas compras calificadas tiene y qué
-- porcentaje le corresponde. Devuelve solo eso, nada del historial.
create or replace function public.loyalty_percent_for_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_cfg     public.loyalty_config%rowtype;
  v_count   int;
  v_percent int := 0;
begin
  select * into v_cfg from public.loyalty_config where id = true;
  if not found or not v_cfg.active then
    return jsonb_build_object('orders', 0, 'percent', 0);
  end if;

  select count(*)::int into v_count
    from public.orders o
   where lower(o.customer_email) = lower(trim(p_email))
     and o.subtotal >= v_cfg.min_order_amount;

  if    v_count >= v_cfg.tier3_orders then v_percent := v_cfg.tier3_percent;
  elsif v_count >= v_cfg.tier2_orders then v_percent := v_cfg.tier2_percent;
  elsif v_count >= v_cfg.tier1_orders then v_percent := v_cfg.tier1_percent;
  end if;

  return jsonb_build_object('orders', v_count, 'percent', v_percent);
end;
$$;

grant execute on function public.loyalty_status()                  to authenticated;
grant execute on function public.loyalty_percent_for_email(text)   to anon, authenticated;
