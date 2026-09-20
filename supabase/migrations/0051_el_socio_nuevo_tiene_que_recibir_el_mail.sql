-- El mail de bienvenida al socio no salía nunca.
--
-- El webhook de Mercado Pago activaba bien el carnet —`socio_pago_por_id` es
-- SECURITY DEFINER y corre por encima de RLS— pero después iba a buscar el mail
-- y el nombre leyendo la tabla `socios` directo:
--
--     select email, nombre from socios where id = ...
--
-- Y ahí no puede. El webhook entra con la clave pública, y la única policy de
-- `socios` es para el staff. No da error: devuelve cero filas. O sea que el
-- socio quedaba activo, con sus beneficios andando, y sin recibir nunca el mail
-- con su número de socio. Un alta muda.
--
-- La respuesta no es abrirle la tabla a la clave pública —ahí quedarían los
-- mails y teléfonos de todos los socios a la vista de cualquiera—, sino que la
-- misma función que ya corre con permisos devuelva lo que hace falta para
-- escribirle. Son datos de la persona que acaba de pagar, y ya vienen de una
-- función cerrada con el secreto.

drop function if exists public.socio_pago_por_id(text, uuid, text, int);

create or replace function public.socio_pago_por_id(
  p_secret text,
  p_id uuid,
  p_pago_id text,
  p_dias int default 30
)
returns table (
  numero int,
  fundador boolean,
  paga_hasta timestamptz,
  nuevo boolean,
  email text,
  nombre text
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_numero int;
  v_nuevo boolean := false;
begin
  if p_secret is null or p_secret <> (select pc.secret from public.push_config pc where pc.id = 1) then
    return;
  end if;
  if p_id is null or not exists (select 1 from public.socios s where s.id = p_id) then
    return;
  end if;

  -- Pago repetido: Mercado Pago reintenta el aviso y no queremos sumar el mes
  -- dos veces.
  if p_pago_id is not null and exists (
    select 1 from public.socios s where s.id = p_id and s.ultimo_pago_id = p_pago_id
  ) then
    return query
      select s.numero, s.fundador, s.paga_hasta, false, s.email, s.nombre
        from public.socios s where s.id = p_id;
    return;
  end if;

  select s.numero into v_numero from public.socios s where s.id = p_id;
  if v_numero is null then
    select coalesce(max(s.numero), 0) + 1 into v_numero from public.socios s;
    v_nuevo := true;
  end if;

  update public.socios s
     set numero = v_numero,
         fundador = (v_numero <= 50),
         desde = coalesce(s.desde, now()),
         paga_hasta = greatest(coalesce(s.paga_hasta, now()), now()) + make_interval(days => p_dias),
         ultimo_pago_id = coalesce(p_pago_id, s.ultimo_pago_id),
         baja_el = null,
         aviso_renovacion_el = null,
         updated_at = now()
   where s.id = p_id;

  return query
    select s.numero, s.fundador, s.paga_hasta, v_nuevo, s.email, s.nombre
      from public.socios s where s.id = p_id;
end;
$function$;

grant execute on function public.socio_pago_por_id(text, uuid, text, int) to anon, authenticated;
