-- =====================================================================
-- CASACA DE CANCHA — El DNI del cliente y la ganancia del mes
--
-- Dos cosas más del barrido de funciones `security definer`. La primera
-- es la peor de toda la auditoría, porque los datos no son del negocio:
-- son de los clientes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. storefront_get_order devolvía LA FILA ENTERA del pedido
--
-- Hacía `to_jsonb(o)`, o sea todas las columnas de `orders` más todas
-- las de `order_items`. Con la clave pública y un número de pedido salía:
--
--   DNI, dirección, código postal, teléfono, mail, las notas internas
--   del pedido, de dónde vino la visita (referrer, utm, fbclid) y el
--   costo de cada camiseta (o sea el margen).
--
-- Y los números de pedido son correlativos: CDC-1009, CDC-1010,
-- CDC-1011. No hay que adivinar nada, se cuenta. Cualquiera podía
-- recorrerlos y juntar el padrón de clientes con DNI y domicilio.
--
-- La PÁGINA de confirmación estaba bien hecha: no muestra nada de eso.
-- El problema era la función, que se puede llamar sin pasar por la
-- página.
--
-- Ahora devuelve una lista explícita: lo que la tienda realmente usa
-- para mostrar el pedido, mandar el mail de confirmación, el WhatsApp y
-- armar el pago de Mercado Pago. Nada más.
--
-- Queda afuera a propósito: dni, address, postal_code, city, province,
-- notes, internal_notes, customer_id, estimated_cost, channel, y todo el
-- rastreo (utm_*, fbclid, referrer, landing_page, device). De los ítems
-- queda afuera `unit_cost`, que es lo que costó cada camiseta.
--
-- Siguen saliendo nombre, mail y teléfono porque son los que usan el
-- mail de confirmación, el WhatsApp y Mercado Pago. Para que tampoco
-- salgan habría que sacar el número de pedido de la URL de confirmación
-- y usar el código al azar (`tracking_ref`), que ya existe — pero eso
-- cambia links que ya se mandaron, así que se decide aparte.
-- ---------------------------------------------------------------------
create or replace function public.storefront_get_order(p_order_number text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select jsonb_build_object(
    'id',                  o.id,
    'order_number',        o.order_number,
    'subtotal',            o.subtotal,
    'discount',            o.discount,
    'coupon_code',         o.coupon_code,
    'coupon_discount',     o.coupon_discount,
    'shipping_cost',       o.shipping_cost,
    'total',               o.total,
    'payment_method',      o.payment_method,
    'payment_status',      o.payment_status,
    'order_status',        o.order_status,
    'shipping_method',     o.shipping_method,
    'delivery_status',     o.delivery_status,
    'delivery_updated_at', o.delivery_updated_at,
    'carrier',             o.carrier,
    'tracking_code',       o.tracking_code,
    'tracking_ref',        o.tracking_ref,
    -- Los usan el mail de confirmación, el WhatsApp y Mercado Pago.
    'customer_name',       o.customer_name,
    'customer_email',      o.customer_email,
    'customer_phone',      o.customer_phone,
    'created_at',          o.created_at,
    'order_items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',           oi.id,
        'product_id',   oi.product_id,
        'variant_id',   oi.variant_id,
        'product_name', oi.product_name,
        'size',         oi.size,
        'quantity',     oi.quantity,
        'unit_price',   oi.unit_price,
        'discount',     oi.discount,
        'subtotal',     oi.subtotal
        -- `unit_cost` NO: es el costo de la camiseta.
      ) order by oi.id)
      from public.order_items oi where oi.order_id = o.id), '[]'::jsonb)
  )
  from public.orders o
  where o.order_number = p_order_number;
$function$;

-- ---------------------------------------------------------------------
-- 2. profit_by_month: la ganancia mes a mes, y no la usa nadie
--
-- Devolvía facturación, costo, margen y unidades de cada mes del
-- negocio. Con la clave pública.
--
-- No la llama ninguna pantalla — quedó de algo anterior. Igual se deja
-- creada y con control, por si hace falta: lo que se saca es que la
-- pueda ejecutar cualquiera.
-- ---------------------------------------------------------------------
create or replace function public.profit_by_month()
returns table(month text, revenue numeric, cost numeric, margin numeric, units integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with rows as (
    select date_trunc('month', e.created_at) as m,
           ei.quantity*ei.sale_price as rev, ei.quantity*ei.unit_cost as cost, ei.quantity as q
    from encargo_items ei join encargos e on e.id=ei.encargo_id
    where public.is_admin() and e.status <> 'cancelado'
    union all
    select date_trunc('month', o.created_at),
           oi.quantity*oi.unit_price, oi.quantity*oi.unit_cost, oi.quantity
    from order_items oi join orders o on o.id=oi.order_id
    where public.is_admin() and o.payment_status='paid'
  )
  select to_char(m,'YYYY-MM'), sum(rev), sum(cost), sum(rev-cost), sum(q)::int
  from rows group by m order by m;
$function$;

revoke all on function public.profit_by_month() from public, anon;
grant execute on function public.profit_by_month() to authenticated;
