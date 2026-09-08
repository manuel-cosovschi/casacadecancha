-- =====================================================================
-- CASACA DE CANCHA — Fidelidad sin cuentas
--
-- El descuento por ser cliente pasa a aplicarse SOLO con el email, sin
-- código y sin registro. Eso lo vuelve mucho más fácil de usar, y también
-- mucho más fácil de abusar: por eso esta migración endurece el conteo.
--
-- Antes se contaba CUALQUIER pedido con subtotal >= umbral, sin mirar si
-- se había pagado. Como cargar un pedido en la web no cuesta nada, alguien
-- podía dejar tres pedidos que nunca iba a pagar y quedar en 20% para
-- siempre. Ahora solo cuentan las compras realmente cobradas.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Compras que califican para el programa
-- ---------------------------------------------------------------------
-- Una compra cuenta si:
--   * supera el umbral (medido sobre el SUBTOTAL, antes de descuentos, para
--     que usar un descuento no descalifique la compra siguiente);
--   * está efectivamente PAGADA;
--   * y no terminó cancelada ni devuelta.
--
-- 'exchanged' sí cuenta: un cambio es una venta que se concretó.
create or replace function public.loyalty_qualifying_orders(p_email text)
returns int
language sql
security definer
set search_path = public
stable
as $$
  select count(*)::int
    from public.orders o
    join public.loyalty_config c on c.id = true
   where lower(o.customer_email) = lower(trim(p_email))
     and o.subtotal >= c.min_order_amount
     and o.payment_status = 'paid'
     and o.order_status not in ('cancelled', 'returned');
$$;

-- No se expone directo: solo la usan las dos funciones de abajo, que ya
-- corren como su dueño. Cuanto menos superficie pública, mejor.
revoke execute on function public.loyalty_qualifying_orders(text) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- Nivel por email — la que usa el checkout (sin sesión del cliente)
-- ---------------------------------------------------------------------
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
    return jsonb_build_object('orders', 0, 'percent', 0, 'active', false);
  end if;

  v_count := public.loyalty_qualifying_orders(p_email);

  if    v_count >= v_cfg.tier3_orders then v_percent := v_cfg.tier3_percent;
  elsif v_count >= v_cfg.tier2_orders then v_percent := v_cfg.tier2_percent;
  elsif v_count >= v_cfg.tier1_orders then v_percent := v_cfg.tier1_percent;
  end if;

  return jsonb_build_object(
    'orders',     v_count,
    'percent',    v_percent,
    'active',     true,
    'min_amount', v_cfg.min_order_amount
  );
end;
$$;


-- ---------------------------------------------------------------------
-- Nivel del usuario logueado — queda para el día que haya cuentas
-- ---------------------------------------------------------------------
create or replace function public.loyalty_status()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_email text;
begin
  select email into v_email from public.profiles where id = auth.uid();
  if v_email is null then
    return jsonb_build_object('ok', false, 'reason', 'sin_sesion');
  end if;
  return public.loyalty_percent_for_email(v_email)
         || jsonb_build_object('ok', true, 'email', v_email);
end;
$$;

grant execute on function public.loyalty_status()                to authenticated;
grant execute on function public.loyalty_percent_for_email(text) to anon, authenticated;
