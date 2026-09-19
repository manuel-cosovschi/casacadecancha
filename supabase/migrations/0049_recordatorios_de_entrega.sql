-- Recordatorios de entrega.
--
-- Un pedido que se aceptó o se cobró y todavía no salió de la casa no avisa
-- nada por sí solo: queda en la lista del panel esperando que alguien se
-- acuerde de mirarla. Esto lo convierte en una notificación al celular.
--
-- Dos cosas que hacen falta del lado de la base:
--
--  1) Una marca de cuándo se avisó por última vez, para que el recordatorio
--     sea uno por día y no uno por cada vez que corra el cron (o por cada vez
--     que alguien lo dispare a mano probando).
--
--  2) Una función que devuelva los pedidos pendientes. El cron entra con la
--     clave pública, que no puede leer `orders` —y está bien que no pueda—, así
--     que la lectura va por una función SECURITY DEFINER cerrada con el mismo
--     secreto que ya usan los otros crons.

alter table public.orders
  add column if not exists entrega_avisada_el timestamptz;

comment on column public.orders.entrega_avisada_el is
  'Última vez que se mandó el recordatorio de entrega al celular. Sirve para no repetirlo el mismo día.';

/**
 * Los pedidos que hay que entregar.
 *
 * Qué entra: todo lo que ya se aceptó (pasó de "nuevo") o ya está pago, y
 * todavía no se entregó. Lo cancelado, devuelto o cambiado queda afuera.
 *
 * Qué NO entra: lo que ya se avisó hace menos de `p_horas`. Sin esa condición,
 * un pedido que tarda una semana en entregarse manda siete notificaciones
 * iguales y la octava ya no la lee nadie.
 */
create or replace function public.pedidos_por_entregar(p_secret text, p_horas integer default 20)
returns table (
  id uuid,
  order_number text,
  customer_name text,
  customer_phone text,
  shipping_method text,
  payment_method payment_method,
  payment_status payment_status,
  order_status order_status,
  total numeric,
  notes text,
  internal_notes text,
  created_at timestamptz,
  dias_esperando int
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- `pc.id` y no `id` a secas: esta función devuelve una columna que también se
  -- llama `id`, y sin el alias Postgres no sabe a cuál de las dos te referís y
  -- corta con "column reference id is ambiguous". El chequeo del secreto falla,
  -- la función no devuelve nada y el recordatorio no llega nunca.
  if p_secret is null or p_secret <> (select pc.secret from public.push_config pc where pc.id = 1) then
    return;
  end if;

  return query
    select
      o.id,
      o.order_number,
      o.customer_name,
      o.customer_phone,
      o.shipping_method,
      o.payment_method,
      o.payment_status,
      o.order_status,
      o.total,
      o.notes,
      o.internal_notes,
      o.created_at,
      greatest(0, extract(day from (now() - o.created_at))::int) as dias_esperando
    from public.orders o
    where o.order_status not in ('delivered', 'cancelled', 'returned', 'exchanged')
      and (
        o.payment_status = 'paid'
        or o.order_status in ('preparing', 'ready', 'shipped')
      )
      and (
        o.entrega_avisada_el is null
        or o.entrega_avisada_el < now() - make_interval(hours => p_horas)
      )
    order by o.created_at;
end;
$function$;

/** Deja asentado que ya se avisó, para no repetirlo hasta mañana. */
create or replace function public.marcar_entrega_avisada(p_secret text, p_ids uuid[])
returns int
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_n int;
begin
  if p_secret is null or p_secret <> (select pc.secret from public.push_config pc where pc.id = 1) then
    return 0;
  end if;
  update public.orders o set entrega_avisada_el = now() where o.id = any(p_ids);
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;

-- Las dos son para el cron, que entra con la clave pública y trae el secreto.
-- Sin el secreto devuelven vacío, así que exponerlas no abre nada.
grant execute on function public.pedidos_por_entregar(text, integer) to anon, authenticated;
grant execute on function public.marcar_entrega_avisada(text, uuid[]) to anon, authenticated;
