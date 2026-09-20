-- La página de "listo" tiene que mirar la base, no la URL.
--
-- Después de pagar, Mercado Pago devuelve a la persona a /socio/listo con un
-- `status` en la dirección. El problema es que ese parámetro puede no venir —si
-- aprieta la flecha para atrás en vez de completar, vuelve sin nada— y ahí la
-- página daba por bueno el pago y saludaba al nuevo socio.
--
-- Que el carnet no se activara desde la URL ya estaba cuidado. Lo que faltaba
-- era que la página tampoco DIJERA nada que no fuera cierto: alguien que no
-- pagó se iba convencido de ser socio, después no le aparecía el descuento en
-- el checkout, y para él la tienda le mintió.
--
-- Con esto la página pregunta por el carnet de verdad. Va por id y no por mail
-- justamente para que no sirva para espiar: hay que tener el uuid en la mano,
-- que es el que le volvió a esa persona al volver de pagar.

create or replace function public.socio_estado_por_id(p_id uuid)
returns table (activo boolean, numero int, fundador boolean, paga_hasta timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    (s.paga_hasta is not null and s.paga_hasta > now()) as activo,
    s.numero,
    s.fundador,
    s.paga_hasta
  from public.socios s
  where s.id = p_id
    and s.baja_el is null
  limit 1;
$function$;

-- La llama la página pública con la clave anónima. No expone ni el mail ni el
-- teléfono: solo si ese carnet está al día y su número.
grant execute on function public.socio_estado_por_id(uuid) to anon, authenticated;
