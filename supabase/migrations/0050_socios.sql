-- Socio Casaca: el carnet mensual.
--
-- La idea es simple: pagás una cuota por mes y mientras esté al día tenés 15%
-- en todo, envío sin cargo en Mar del Plata, y ves lo que llega antes que el
-- resto. Nada de saldo a favor ni plata guardada: la cuota que entra es de la
-- tienda en el momento, y si alguien se da de baja los beneficios se cortan
-- cuando termina el mes que ya pagó. No queda nada que devolver.
--
-- Por eso el estado del socio es una sola fecha: `paga_hasta`. Todo lo demás
-- —si tiene beneficios hoy, si hay que recordarle que renueve, si venció— sale
-- de compararla contra `now()`. Un solo dato que puede estar mal en vez de
-- cinco que se pueden contradecir entre sí.

create table if not exists public.socios (
  id uuid primary key default gen_random_uuid(),
  -- El número de socio, como el del club. Se asigna cuando entra la PRIMERA
  -- cuota, no cuando alguien llena el formulario: si no, el que se anota y
  -- nunca paga se queda con el número bajo y el que sí paga arranca en el 40.
  -- Queda suyo para siempre, aunque se dé de baja y vuelva.
  numero int unique,
  email text not null unique,
  nombre text,
  telefono text,
  -- Los primeros socios se quedan con la cuota que pagaron al entrar, aunque
  -- después suba. Se guarda en vez de calcularlo con `numero <= 50` para que
  -- mover ese límite mañana no le saque el beneficio a quien ya lo tiene.
  fundador boolean not null default false,
  cuota numeric(12,2) not null,
  -- Cuándo pagó la primera cuota. Null mientras solo se anotó y todavía no pagó.
  desde timestamptz,
  -- Hasta cuándo tiene beneficios. Es TODO el estado del socio.
  paga_hasta timestamptz,
  -- Para no procesar dos veces el mismo pago si Mercado Pago repite el aviso.
  ultimo_pago_id text,
  -- Cuándo se le mandó el último aviso de renovación.
  aviso_renovacion_el timestamptz,
  baja_el timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists socios_email_key on public.socios (lower(email));
create index if not exists socios_paga_hasta_idx on public.socios (paga_hasta);

comment on table public.socios is
  'Socios del carnet mensual. `paga_hasta` es el estado: con fecha futura tiene beneficios, sin ella no.';
comment on column public.socios.paga_hasta is
  'Hasta cuándo rigen los beneficios. No hay saldo a favor: vencida la fecha, se cortan.';

alter table public.socios enable row level security;

-- Nadie lee esta tabla con la clave pública. El checkout pregunta por un mail
-- puntual a través de `socio_estado`, que devuelve lo justo y nada más.
drop policy if exists staff_socios on public.socios;
create policy staff_socios on public.socios
  for all using (public.is_staff_writer()) with check (public.is_staff_writer());

/**
 * ¿Este mail es socio hoy?
 *
 * La usa el checkout apenas el cliente escribe su mail, igual que
 * `loyalty_percent_for_email`. Devuelve solo lo que hace falta para aplicar el
 * beneficio y mostrarlo: si está al día, su número y hasta cuándo pagó. Ni el
 * teléfono ni el resto de la ficha salen de acá.
 */
create or replace function public.socio_estado(p_email text)
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
  where lower(s.email) = lower(trim(p_email))
    and s.baja_el is null
  limit 1;
$function$;

/**
 * Anota a alguien que quiere el carnet, ANTES de que pague.
 *
 * La llama la página pública para tener dónde guardar el nombre y el teléfono
 * mientras la persona va a pagar a Mercado Pago. Todavía no es socio: queda sin
 * `numero` y sin `paga_hasta`, así que `socio_estado` lo da inactivo.
 *
 * No pide secreto porque la llama cualquiera desde la web, igual que anotarse
 * en la lista de correo. Lo único que puede hacer un abusador es crear filas
 * sin pagar, y eso no le saca el número a nadie: el número se asigna recién
 * cuando entra la cuota.
 */
create or replace function public.socio_prealta(
  p_email text,
  p_nombre text,
  p_telefono text,
  p_cuota numeric
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
begin
  if p_email is null or position('@' in p_email) = 0 then
    return null;
  end if;

  insert into public.socios (email, nombre, telefono, cuota)
  values (
    lower(trim(p_email)),
    nullif(trim(coalesce(p_nombre, '')), ''),
    nullif(trim(coalesce(p_telefono, '')), ''),
    p_cuota
  )
  on conflict (email) do update
    set nombre = coalesce(nullif(trim(coalesce(p_nombre, '')), ''), public.socios.nombre),
        telefono = coalesce(nullif(trim(coalesce(p_telefono, '')), ''), public.socios.telefono),
        updated_at = now()
  returning id into v_id;

  return v_id;
end;
$function$;

/**
 * Registra una cuota paga y corre la fecha de vencimiento.
 *
 * La llama el webhook de Mercado Pago cuando un pago se aprueba. Tres cuidados:
 *
 *  - Si el pago ya se procesó (`ultimo_pago_id`), no hace nada. Mercado Pago
 *    manda el mismo aviso más de una vez y sin esto un pago valdría dos meses.
 *
 *  - La renovación suma sobre `paga_hasta` si todavía está vigente, y sobre
 *    `now()` si ya venció. Sumar siempre sobre la fecha vieja le regalaría los
 *    meses que estuvo de baja a quien vuelve después de medio año.
 *
 *  - El número de socio se asigna acá, con la primera cuota, y nunca más
 *    cambia. `fundador` sale del número, no de la cantidad de filas: así el que
 *    entra primero es el que se queda con el beneficio, sin importar cuánta
 *    gente se anotó sin pagar.
 */
create or replace function public.socio_pago_por_id(
  p_secret text,
  p_id uuid,
  p_pago_id text,
  p_dias int default 30
)
returns table (numero int, fundador boolean, paga_hasta timestamptz, nuevo boolean)
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
      select s.numero, s.fundador, s.paga_hasta, false from public.socios s where s.id = p_id;
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
    select s.numero, s.fundador, s.paga_hasta, v_nuevo from public.socios s where s.id = p_id;
end;
$function$;

/**
 * Los carnets que están por vencer, para avisarles que renueven.
 *
 * Entra el que vence dentro de `p_dias` y todavía no tiene beneficios cortados,
 * y también el que venció hace poco —hasta 3 días— porque ahí el aviso sigue
 * sirviendo. Más viejo que eso ya no es un recordatorio, es spam.
 */
create or replace function public.socios_por_vencer(p_secret text, p_dias int default 3)
returns table (
  id uuid,
  numero int,
  email text,
  nombre text,
  fundador boolean,
  cuota numeric,
  paga_hasta timestamptz,
  dias_restantes int
)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_secret is null or p_secret <> (select pc.secret from public.push_config pc where pc.id = 1) then
    return;
  end if;

  return query
    select s.id, s.numero, s.email, s.nombre, s.fundador, s.cuota, s.paga_hasta,
           extract(day from (s.paga_hasta - now()))::int
      from public.socios s
     where s.baja_el is null
       and s.paga_hasta is not null
       and s.paga_hasta < now() + make_interval(days => p_dias)
       and s.paga_hasta > now() - interval '3 days'
       and (s.aviso_renovacion_el is null or s.aviso_renovacion_el < s.paga_hasta - interval '30 days')
     order by s.paga_hasta;
end;
$function$;

/** Deja asentado que ya se avisó, para no repetir el mismo recordatorio. */
create or replace function public.socios_marcar_avisados(p_secret text, p_ids uuid[])
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
  update public.socios s set aviso_renovacion_el = now(), updated_at = now() where s.id = any(p_ids);
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;

-- `socio_estado` la llama el checkout con la clave pública: recibe un mail y
-- contesta por ese mail solo. Las otras tres piden el secreto de los crons.
grant execute on function public.socio_estado(text) to anon, authenticated;
grant execute on function public.socio_prealta(text, text, text, numeric) to anon, authenticated;
grant execute on function public.socio_pago_por_id(text, uuid, text, int) to anon, authenticated;
grant execute on function public.socios_por_vencer(text, int) to anon, authenticated;
grant execute on function public.socios_marcar_avisados(text, uuid[]) to anon, authenticated;
