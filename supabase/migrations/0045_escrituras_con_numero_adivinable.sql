-- =====================================================================
-- CASACA DE CANCHA — Escribir en un pedido ajeno sabiendo el número
--
-- Las anteriores eran de leer. Estas son de escribir: tres funciones que
-- cambian datos y tienen como única llave el número de pedido o el
-- código del cupón, que son adivinables.
--
-- No se filtra nada, pero se puede ensuciar la operación del negocio,
-- que a la hora de la verdad cuesta lo mismo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. submit_transfer_proof: marcar pedidos ajenos como "ya transferí"
--
-- Con el número de pedido —que es correlativo— cualquiera podía poner un
-- pedido pendiente en "en revisión" y dejarle pegada una URL inventada
-- como comprobante. Recorriendo CDC-1000 en adelante se ensucia la lista
-- de pagos entera: todos los pedidos aparecen con comprobante y hay que
-- ir a mirarlos uno por uno para descubrir que no hay plata.
--
-- Ahora además hay que mandar el código de seguimiento del pedido
-- (`tracking_ref`), que es al azar y solo lo tiene quien compró. La
-- página de confirmación ya lo tiene a mano, así que para el cliente no
-- cambia nada.
--
-- Se borra la versión de dos argumentos: si quedara, seguiría abierta.
-- ---------------------------------------------------------------------
drop function if exists public.submit_transfer_proof(text, text);

create or replace function public.submit_transfer_proof(
  p_order_number text, p_proof_url text, p_ref text
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid;
begin
  select o.id into v_id
    from public.orders o
   where o.order_number = p_order_number
     and o.tracking_ref is not null
     and upper(trim(o.tracking_ref)) = upper(trim(coalesce(p_ref, '')));

  -- Sin el código no se toca nada, y no se dice por qué.
  if v_id is null then return; end if;

  update public.payments
     set proof_url = p_proof_url,
         status = 'payment_review'
   where order_id = v_id;

  update public.orders
     set payment_status = 'payment_review'
   where id = v_id
     and payment_status = 'pending_payment';
end; $function$;

revoke all on function public.submit_transfer_proof(text, text, text) from public;
grant execute on function public.submit_transfer_proof(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. mp_set_preference: pisar el link de pago de un pedido ajeno
--
-- Mismo problema y misma llave adivinable: se podía cambiar el
-- identificador de la preferencia de Mercado Pago de cualquier pedido y
-- dejar a esa persona sin poder pagar.
-- ---------------------------------------------------------------------
drop function if exists public.mp_set_preference(text, text);

create or replace function public.mp_set_preference(
  p_order_number text, p_preference_id text, p_ref text
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_id uuid;
begin
  select o.id into v_id
    from public.orders o
   where o.order_number = p_order_number
     and o.tracking_ref is not null
     and upper(trim(o.tracking_ref)) = upper(trim(coalesce(p_ref, '')));

  if v_id is null then return; end if;

  update public.payments
     set external_payment_id = p_preference_id
   where order_id = v_id;
end; $function$;

revoke all on function public.mp_set_preference(text, text, text) from public;
grant execute on function public.mp_set_preference(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. increment_promotion_use: quemarle los usos a un cupón
--
-- Suma uno al contador de usos de cualquier cupón activo. Con un cupón
-- que tenga tope —y la idea es que lo tengan— alcanza con llamarla en
-- bucle para agotarlo y que deje de andar para los clientes de verdad.
--
-- No la llama ninguna pantalla: la usa `storefront_create_order` por
-- dentro, al cerrar el pedido. Como esa función es `security definer`,
-- adentro corre con el usuario dueño y la sigue pudiendo llamar. Lo
-- único que se saca es que la pueda ejecutar cualquiera desde afuera.
-- ---------------------------------------------------------------------
revoke all on function public.increment_promotion_use(text) from public, anon, authenticated;
