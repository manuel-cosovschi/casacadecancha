-- =====================================================================
-- CASACA DE CANCHA - RPC del storefront (checkout sin service role)
-- =====================================================================
-- Funciones SECURITY DEFINER que exponen al rol anon sólo operaciones
-- acotadas y seguras: crear un pedido y leer un pedido por número.
-- =====================================================================

create or replace function public.storefront_create_order(p jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_order_id uuid;
  v_order_number text;
  it jsonb;
  rs jsonb;
begin
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

  insert into public.orders (
    customer_id, subtotal, discount, coupon_code, coupon_discount, shipping_cost,
    total, estimated_cost, payment_method, payment_status, order_status,
    shipping_method, channel, customer_name, customer_phone, customer_email,
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

  insert into public.payments (order_id, method, amount, status)
  values (
    v_order_id,
    (p->'order'->>'payment_method')::payment_method,
    coalesce((p->'order'->>'total')::numeric, 0),
    'pending_payment'
  );

  for rs in select * from jsonb_array_elements(coalesce(p->'reservations', '[]'::jsonb)) loop
    update public.product_variants
      set stock_reserved = stock_reserved + coalesce((rs->>'quantity')::int, 0)
      where id = (rs->>'variant_id')::uuid;
    insert into public.inventory_movements (variant_id, type, quantity, reason, related_order_id)
    values (
      (rs->>'variant_id')::uuid,
      'reserva',
      coalesce((rs->>'quantity')::int, 0),
      'Reserva por pedido ' || v_order_number,
      v_order_id
    );
  end loop;

  if (p->>'coupon_code') is not null and (p->>'coupon_code') <> '' then
    perform public.increment_promotion_use(p->>'coupon_code');
  end if;

  return v_order_number;
end; $$;

create or replace function public.storefront_get_order(p_order_number text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(o) || jsonb_build_object(
    'order_items',
    coalesce((select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = o.id), '[]'::jsonb)
  )
  from public.orders o
  where o.order_number = p_order_number;
$$;

revoke all on function public.storefront_create_order(jsonb) from public;
revoke all on function public.storefront_get_order(text) from public;
grant execute on function public.storefront_create_order(jsonb) to anon, authenticated;
grant execute on function public.storefront_get_order(text) to anon, authenticated;
