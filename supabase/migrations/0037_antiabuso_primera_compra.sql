-- =====================================================================
-- CASACA DE CANCHA — Que una misma persona no use el descuento de
-- primera compra con varios mails.
--
-- El código de bienvenida está firmado contra el mail, así que para
-- repetirlo alcanza con usar otro mail — y con Gmail ni siquiera hace
-- falta: `juan@gmail.com`, `j.u.a.n@gmail.com` y `juan+promo@gmail.com`
-- son la MISMA casilla y hoy cuentan como tres personas distintas.
--
-- Acá se cruza por tres señales, no solo por el mail:
--   * mail normalizado (los alias de Gmail colapsan en uno solo)
--   * teléfono normalizado (aguanta +54, 9, 0 y 15)
--   * DNI normalizado
--
-- Ninguna es infalible sola. Juntas cubren el caso real: la misma
-- persona volviendo con otro mail.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Normalizadores
-- IMMUTABLE a propósito: así se pueden indexar por expresión.
-- ---------------------------------------------------------------------

-- Mail canónico. Gmail ignora los puntos y todo lo que vaya después de
-- un "+", así que esas variantes se colapsan. En el resto de los
-- dominios se corta el "+" (casi todos lo soportan) pero los puntos se
-- respetan, porque ahí sí distinguen casillas.
create or replace function public.norm_email(p text)
returns text
language sql
immutable
as $$
  with e as (select lower(trim(coalesce(p, ''))) as x),
  s as (
    select split_part(x, '@', 1) as loc, split_part(x, '@', 2) as dom from e
  )
  select case
    when loc = '' or dom = '' then null
    when dom in ('gmail.com', 'googlemail.com')
      then nullif(replace(split_part(loc, '+', 1), '.', ''), '') || '@gmail.com'
    else nullif(split_part(loc, '+', 1), '') || '@' || dom
  end
  from s;
$$;

-- Teléfono canónico. El mismo número se escribe de mil formas:
--   2235555555 · +54 9 223 555-5555 · 0223 15-555-5555 · 54 223 5555555
-- Se sacan los prefijos (54 país, 9 móvil, 0 interurbano) y el 15 viejo,
-- que va pegado después de la característica. Queda el número real.
create or replace function public.norm_phone(p text)
returns text
language sql
immutable
as $$
  with d as (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as x),
  -- 54 de país, pero solo si lo que queda sigue siendo un número largo:
  -- si no, a alguien de la característica 54 (Junín) le comeríamos dos dígitos.
  p1 as (select case when x like '54%' and length(x) >= 12 then substr(x, 3) else x end as x from d),
  p2 as (select case when x like '9%'  and length(x) >= 11 then substr(x, 2) else x end as x from p1),
  p3 as (select case when x like '0%'  and length(x) >= 11 then substr(x, 2) else x end as x from p2),
  -- El 15 viejo aparece después de la característica (2 a 4 dígitos) y
  -- deja el número con 2 dígitos de más. Solo se saca si sobran.
  p4 as (
    select case
      when length(x) >= 12 and substr(x, 3, 2) = '15' then substr(x, 1, 2) || substr(x, 5)
      when length(x) >= 12 and substr(x, 4, 2) = '15' then substr(x, 1, 3) || substr(x, 6)
      when length(x) >= 12 and substr(x, 5, 2) = '15' then substr(x, 1, 4) || substr(x, 7)
      else x
    end as x from p3
  )
  -- Menos de 8 dígitos no identifica a nadie: mejor null que un falso positivo.
  select case when length(x) >= 8 then right(x, 10) else null end from p4;
$$;

-- DNI canónico: solo dígitos, y solo si tiene pinta de DNI. Un "0" o un
-- "123" matchearía con cualquier cosa, así que se descartan.
create or replace function public.norm_dni(p text)
returns text
language sql
immutable
as $$
  select case
    when length(x) between 7 and 9 then x
    else null
  end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as x) s;
$$;

-- ---------------------------------------------------------------------
-- El DNI en el pedido
-- Vivía solo en `customers`, que se puede editar después. Guardarlo en el
-- pedido deja asentado con qué DNI se compró ESA vez.
-- ---------------------------------------------------------------------
alter table public.orders add column if not exists dni text;

update public.orders o
   set dni = c.dni
  from public.customers c
 where c.id = o.customer_id
   and o.dni is null
   and nullif(trim(coalesce(c.dni, '')), '') is not null;

-- Índices por expresión: sin esto, cada chequeo recorre la tabla entera.
create index if not exists orders_norm_email_idx on public.orders (public.norm_email(customer_email));
create index if not exists orders_norm_phone_idx on public.orders (public.norm_phone(customer_phone));
create index if not exists orders_norm_dni_idx   on public.orders (public.norm_dni(dni));

-- ---------------------------------------------------------------------
-- La verificación
--
-- Devuelve qué encontró, no una decisión: quién decide es el código, que
-- es el que sabe qué descuento se está pidiendo.
--
-- Los pedidos cancelados y devueltos no cuentan: si le cancelaste vos la
-- compra, no es justo que además le quemes el descuento.
-- ---------------------------------------------------------------------
create or replace function public.first_purchase_check(
  p_email text,
  p_phone text default null,
  p_dni   text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text := public.norm_email(p_email);
  v_phone text := public.norm_phone(p_phone);
  v_dni   text := public.norm_dni(p_dni);
  v_total int := 0;
  v_welcome int := 0;
  v_via text := null;
begin
  if v_email is null and v_phone is null and v_dni is null then
    return jsonb_build_object('orders', 0, 'welcome_orders', 0, 'via', null);
  end if;

  select count(*)::int,
         count(*) filter (where upper(coalesce(o.coupon_code, '')) like 'BV-%')::int
    into v_total, v_welcome
    from public.orders o
   where o.order_status not in ('cancelled', 'returned')
     and (
       (v_email is not null and public.norm_email(o.customer_email) = v_email)
       or (v_phone is not null and public.norm_phone(o.customer_phone) = v_phone)
       or (v_dni is not null and public.norm_dni(o.dni) = v_dni)
     );

  -- Con qué señal se lo encontró. Sirve para el mensaje y para que vos
  -- puedas revisar un caso dudoso: no es lo mismo un DNI repetido que un
  -- teléfono, que puede ser el de la madre.
  if v_total > 0 then
    if v_dni is not null and exists (
      select 1 from public.orders o
       where o.order_status not in ('cancelled', 'returned')
         and public.norm_dni(o.dni) = v_dni
    ) then
      v_via := 'dni';
    elsif v_email is not null and exists (
      select 1 from public.orders o
       where o.order_status not in ('cancelled', 'returned')
         and public.norm_email(o.customer_email) = v_email
    ) then
      v_via := 'email';
    else
      v_via := 'phone';
    end if;
  end if;

  return jsonb_build_object('orders', v_total, 'welcome_orders', v_welcome, 'via', v_via);
end;
$$;

revoke all on function public.first_purchase_check(text, text, text) from public;
grant execute on function public.first_purchase_check(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- El DNI, dentro del pedido
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
  v_reserved int;
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

  -- Cupón
  if (p->>'coupon_code') is not null and (p->>'coupon_code') <> '' then
    perform public.increment_promotion_use(p->>'coupon_code');
  end if;

  return v_order_number;
end; $function$;
