-- =====================================================================
-- CASACA DE CANCHA — Dos cosas que salieron de revisar por qué "nadie
-- compra": una que rompí ayer y una que estaba esperando para romperse.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. mp_set_preference: pedía un código que en Mercado Pago no existe
--
-- Ayer le agregué el código de seguimiento como prueba de que el pedido
-- es de quien escribe. Para transferencia va bien, porque ese código se
-- asigna al crear el pedido. Para Mercado Pago NO: `assign_tracking_ref`
-- lo asigna recién cuando el pago queda confirmado, así que al momento
-- de guardar la preferencia el pedido todavía no tiene código y la
-- condición no se cumple nunca.
--
-- Resultado: desde ayer, NINGÚN pedido de Mercado Pago guardaba su
-- preferencia. El cliente podía pagar igual —el link se genera aparte y
-- el webhook cruza por número de pedido, no por este campo— pero en el
-- panel quedaba sin registro de con qué preferencia se pagó.
--
-- Y el control tampoco servía para lo que yo creía: nadie paga con este
-- campo. Cada vez que el cliente toca "pagar" se genera una preferencia
-- nueva y se lo manda a esa; el valor guardado es un apunte, no una
-- llave. Pisarlo no deja a nadie sin pagar.
--
-- Así que vuelve a dos argumentos, con un cerrojo que sí tiene sentido:
-- solo se escribe mientras el pago siga pendiente. Un pedido ya cobrado
-- no se toca más.
-- ---------------------------------------------------------------------
drop function if exists public.mp_set_preference(text, text, text);

create or replace function public.mp_set_preference(
  p_order_number text, p_preference_id text
) returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.payments p
     set external_payment_id = p_preference_id
    from public.orders o
   where o.id = p.order_id
     and o.order_number = p_order_number
     -- Un pedido ya cobrado no se reescribe.
     and p.status = 'pending_payment';
end; $function$;

revoke all on function public.mp_set_preference(text, text) from public;
grant execute on function public.mp_set_preference(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. submit_transfer_proof: que no se pueda fallar en silencio
--
-- Esta quedó bien —los pedidos por transferencia sí tienen código desde
-- el minuto cero, y está probado en producción—, pero tenía el mismo
-- defecto de fondo que hizo que lo de arriba pasara desapercibido: si no
-- encontraba el pedido, no escribía nada y no decía nada. La página le
-- contestaba "listo" al cliente igual.
--
-- Un comprobante que se pierde sin que nadie se entere es una venta que
-- se pierde sin que nadie se entere. Ahora devuelve si aplicó o no, y la
-- página corta con un error de verdad si no aplicó.
--
-- Sigue sin decir POR QUÉ falló: al que prueba números de pedido ajenos
-- no hay que contestarle si existen o no.
-- ---------------------------------------------------------------------
drop function if exists public.submit_transfer_proof(text, text, text);

create or replace function public.submit_transfer_proof(
  p_order_number text, p_proof_url text, p_ref text
) returns boolean
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

  if v_id is null then return false; end if;

  update public.payments
     set proof_url = p_proof_url,
         status = 'payment_review'
   where order_id = v_id;

  update public.orders
     set payment_status = 'payment_review'
   where id = v_id
     and payment_status = 'pending_payment';

  return true;
end; $function$;

revoke all on function public.submit_transfer_proof(text, text, text) from public;
grant execute on function public.submit_transfer_proof(text, text, text) to anon, authenticated;
