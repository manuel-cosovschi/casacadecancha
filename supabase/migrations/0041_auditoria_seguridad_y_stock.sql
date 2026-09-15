-- =====================================================================
-- CASACA DE CANCHA — Tres cosas que salieron de la auditoría
--
--   1. Las finanzas del negocio eran legibles por cualquiera
--   2. Los códigos de cupón se podían listar desde el navegador
--   3. Dos personas podían comprar la misma última camiseta a la vez
--
-- Las dos primeras están verificadas, no son teóricas: con la clave
-- pública que viaja en el bundle del login se leían la caja, la meta de
-- ahorro y todos los cupones activos.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. store_settings: la tienda lee lo suyo, la plata no
--
-- La política pública era `using (true)`, así que con la clave pública se
-- leían TODAS las claves — incluidas `finance` (caja, porcentajes de
-- reposición y reinversión) y `savings` (meta de ahorro y fecha).
--
-- Ahora la lista es explícita. Agregar una clave nueva de negocio no la
-- expone por olvido: hay que sumarla acá a propósito.
-- ---------------------------------------------------------------------
drop policy if exists pub_read_settings on public.store_settings;
create policy pub_read_settings on public.store_settings
  for select using (
    key in (
      'announcement_bar', 'brand', 'footer', 'hero', 'home_sections',
      'mundial_block', 'payments_mercadopago', 'payments_transfer',
      'seo', 'shipping', 'shipping_calc', 'trust_strip', 'vacation',
      'whatsapp', 'analytics'
    )
  );

-- El admin sigue leyendo todo por su propia política (admin_read_store_settings).

-- ---------------------------------------------------------------------
-- 2. promotions: validar un cupón sí, listarlos no
--
-- La política pública era `using (active = true)`: alcanzaba con pedir la
-- tabla para tener todos los códigos vivos. MUNDIAL10 además no tiene
-- tope de usos.
--
-- Se saca la lectura pública y se reemplaza por una función que resuelve
-- UN código exacto. Para usarla hay que saber el código de antemano, que
-- es justamente la idea de un cupón.
-- ---------------------------------------------------------------------
create or replace function public.coupon_lookup(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select to_jsonb(x) from (
    select id, code, type, percentage, fixed_amount, minimum_amount,
           start_date, end_date, max_uses, used_count, active
      from public.promotions
     where active = true
       and code is not null
       and lower(trim(code)) = lower(trim(p_code))
     limit 1
  ) x;
$$;

revoke all on function public.coupon_lookup(text) from public;
grant execute on function public.coupon_lookup(text) to anon, authenticated;

drop policy if exists pub_read_promotions on public.promotions;

-- ---------------------------------------------------------------------
-- 3. Que no se pueda vender dos veces la última camiseta
--
-- El checkout mira la disponibilidad en TypeScript y después esta función
-- suma la reserva sin volver a chequear. Entre una cosa y la otra puede
-- entrar otro pedido: los dos pasan el control y uno se queda sin
-- camiseta. Con stock de 1 unidad en casi todo, no es tan improbable.
--
-- Ahora la reserva se aplica CONDICIONADA, en la misma sentencia que la
-- verifica: si no queda, no actualiza ninguna fila y la función corta con
-- error. Al ser una sola transacción, el pedido entero se deshace.
--
-- `allow_backorder` sigue pudiendo reservar de más: para esos productos
-- se vende sabiendo que todavía no está.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.storefront_create_order(p jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  it jsonb;
  rs jsonb;
  v_qty int;
  v_ok int;
  v_nombre text;
begin
  -- Cliente
  insert into public.customers (
    first_name, last_name, phone, email, dni, province, city, postal_code, address,
    source, utm_source, utm_medium, utm_campaign
  ) values (
    p->'customer'->>'first_name',
    p->'customer'->>'last_name',
    p->'customer'->>'phone',
    p->'customer'->>'email',
    p->'customer'->>'dni',
    p->'customer'->>'province',
    p->'customer'->>'city',
    p->'customer'->>'postal_code',
    p->'customer'->>'address',
    'web',
    p->'customer'->>'utm_source',
    p->'customer'->>'utm_medium',
    p->'customer'->>'utm_campaign'
  ) returning id into v_customer_id;

  -- Pedido
  insert into public.orders (
    customer_id, subtotal, discount, coupon_code, coupon_discount, shipping_cost,
    total, estimated_cost, payment_method, payment_status, order_status,
    shipping_method, channel, customer_name, customer_phone, customer_email, dni,
    province, city, address, postal_code, notes,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    fbclid, referrer, landing_page, device
  ) values (
    v_customer_id,
    coalesce((p->'order'->>'subtotal')::numeric, 0),
    coalesce((p->'order'->>'discount')::numeric, 0),
    p->'order'->>'coupon_code',
    coalesce((p->'order'->>'coupon_discount')::numeric, 0),
    coalesce((p->'order'->>'shipping_cost')::numeric, 0),
    coalesce((p->'order'->>'total')::numeric, 0),
    coalesce((p->'order'->>'estimated_cost')::numeric, 0),
    (p->'order'->>'payment_method')::payment_method,
    'pending_payment',
    'new',
    p->'order'->>'shipping_method',
    'web',
    p->'order'->>'customer_name',
    p->'order'->>'customer_phone',
    p->'order'->>'customer_email',
    -- El DNI queda asentado en el pedido y no solo en el cliente, que se
    -- puede editar después: acá se ve con qué DNI se compró ESA vez.
    nullif(trim(coalesce(p->'customer'->>'dni', '')), ''),
    p->'order'->>'province',
    p->'order'->>'city',
    p->'order'->>'address',
    p->'order'->>'postal_code',
    p->'order'->>'notes',
    p->'order'->>'utm_source',
    p->'order'->>'utm_medium',
    p->'order'->>'utm_campaign',
    p->'order'->>'utm_content',
    p->'order'->>'utm_term',
    p->'order'->>'fbclid',
    p->'order'->>'referrer',
    p->'order'->>'landing_page',
    p->'order'->>'device'
  ) returning id, order_number into v_order_id, v_order_number;

  -- Items
  for it in select * from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb)) loop
    insert into public.order_items (
      order_id, product_id, variant_id, product_name, size, quantity,
      unit_price, unit_cost, subtotal
    ) values (
      v_order_id,
      nullif(it->>'product_id','')::uuid,
      nullif(it->>'variant_id','')::uuid,
      it->>'product_name',
      it->>'size',
      coalesce((it->>'quantity')::int, 1),
      coalesce((it->>'unit_price')::numeric, 0),
      coalesce((it->>'unit_cost')::numeric, 0),
      coalesce((it->>'subtotal')::numeric, 0)
    );
  end loop;

  -- Pago
  insert into public.payments (order_id, method, amount, status)
  values (
    v_order_id,
    (p->'order'->>'payment_method')::payment_method,
    coalesce((p->'order'->>'total')::numeric, 0),
    'pending_payment'
  );

  -- Reserva de stock + movimientos
  for rs in select * from jsonb_array_elements(coalesce(p->'reservations', '[]'::jsonb)) loop
    v_qty := coalesce((rs->>'quantity')::int, 0);

    -- La condición viaja en el propio UPDATE: si entre el control del
    -- checkout y este momento entró otro pedido, no actualiza nada.
    update public.product_variants v
       set stock_reserved = v.stock_reserved + v_qty
      where v.id = (rs->>'variant_id')::uuid
        and (
          v.stock_physical - v.stock_reserved - v.encargo_reserved >= v_qty
          or exists (
            select 1 from public.products pr
             where pr.id = v.product_id and pr.allow_backorder
          )
        );

    get diagnostics v_ok = row_count;
    if v_ok = 0 then
      select coalesce(pr.name, 'un producto') into v_nombre
        from public.product_variants v
        join public.products pr on pr.id = v.product_id
       where v.id = (rs->>'variant_id')::uuid;
      -- Corta la transacción entera: no queda ni el pedido ni el cliente.
      raise exception 'SIN_STOCK:%', coalesce(v_nombre, 'un producto')
        using errcode = 'check_violation';
    end if;

    insert into public.inventory_movements (variant_id, type, quantity, reason, related_order_id)
    values (
      (rs->>'variant_id')::uuid,
      'reserva',
      v_qty,
      'Reserva por pedido ' || v_order_number,
      v_order_id
    );
  end loop;

  -- Cupón
  if (p->>'coupon_code') is not null and (p->>'coupon_code') <> '' then
    perform public.increment_promotion_use(p->>'coupon_code');
  end if;

  return v_order_number;
end; $function$;
