-- Los costos de cada camiseta eran públicos.
--
-- Con la clave pública de la página —la que viaja en el navegador de cualquier
-- visitante— se podía leer `products.unit_cost` y `packaging_cost`:
--
--   Argentina Suplente 2026 — China G5   precio $45.000   costo $30.021
--   Argentina Suplente 2026              precio $31.111   costo $12.000
--
-- O sea, la estructura de márgenes entera, producto por producto, a la vista de
-- cualquiera que supiera mirar. Para un competidor es exactamente el dato que
-- no se comparte.
--
-- No alcanza con revocar la columna: el checkout la necesitaba para dejar
-- asentado cuánto costó cada pedido, y el servidor lee con la MISMA clave
-- pública que el navegador. Así que primero el cálculo se mueve adentro de
-- `storefront_create_order` —que corre como SECURITY DEFINER y sí puede ver los
-- costos— y recién después se revoca la lectura.
--
-- Esta versión parte del código que está corriendo en la base, no del archivo
-- de la migración 0041: la función cambió después de aquella (hoy devuelve
-- `text` y el cupón pasa por `increment_promotion_use`), y reescribirla desde
-- el archivo viejo habría deshecho esos cambios sin que nadie lo note.

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
  v_costo numeric;
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
    0,
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
    -- El costo sale de la base, no del payload: `unit_cost`, `packaging_cost`
    -- y `variant_cost` dejaron de ser legibles con la clave pública, y de paso
    -- el número que queda guardado es el de verdad y no el que mande quien
    -- llame a la función.
    select coalesce(v.variant_cost, pr.unit_cost, 0) + coalesce(pr.packaging_cost, 0)
      into v_costo
      from public.product_variants v
      join public.products pr on pr.id = v.product_id
     where v.id = nullif(it->>'variant_id', '')::uuid;

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
      coalesce(v_costo, 0),
      coalesce((it->>'subtotal')::numeric, 0)
    );
  end loop;

  -- El costo del pedido es la suma de lo que costó cada ítem.
  update public.orders o
     set estimated_cost = coalesce(
           (select sum(i.unit_cost * i.quantity) from public.order_items i
             where i.order_id = v_order_id), 0)
   where o.id = v_order_id;

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
end; $function$
;


-- Ahora sí: los costos dejan de ser legibles desde afuera. Es un permiso por
-- COLUMNA, así que el resto de la tabla se sigue leyendo normal y la tienda no
-- se entera.
revoke select (unit_cost, packaging_cost) on public.products from anon;
revoke select (variant_cost) on public.product_variants from anon;

-- El `revoke ... (columna)` de arriba no alcanzó, y vale la pena dejarlo
-- escrito: `anon` tenía SELECT sobre la TABLA entera, y en Postgres ese
-- permiso pisa cualquier revocación por columna. Hay que sacar el permiso de
-- tabla y volver a darlo columna por columna.
--
-- Solo se toca `anon`, que es la clave que viaja en el navegador.
-- `authenticated` queda igual: el panel entra logueado y necesita los costos
-- para calcular márgenes y ganancias.
--
-- OJO al agregar una columna nueva a estas tablas: no va a quedar visible para
-- la tienda hasta que se la agregue acá. Es a propósito —así una columna
-- sensible nueva no se publica sola— pero si algo deja de aparecer en la
-- página, mirá primero esta lista.

revoke select on public.products from anon;
grant select (
    id, name, slug, short_description, description, price,
    compare_at_price, category_id, material, fabric, care, badge, active,
    featured, allow_backorder, hide_when_out_of_stock, sort_order,
    seo_title, seo_description, created_at, updated_at,
    transfer_discount, preorder, mystery_box, mystery_qty
) on public.products to anon;

revoke select on public.product_variants from anon;
grant select (
    id, product_id, size, color, model, sku, stock_physical,
    stock_reserved, stock_minimum, variant_price, active, sort_order,
    created_at, encargo_reserved
) on public.product_variants to anon;

