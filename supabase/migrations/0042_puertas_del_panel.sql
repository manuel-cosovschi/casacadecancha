-- =====================================================================
-- CASACA DE CANCHA — Lo que quedaba abierto por el costado
--
-- La migración anterior cerró la lectura pública de `store_settings`,
-- pero las mismas cosas salían igual por funciones `security definer`
-- que cualquiera podía llamar con la clave pública. Cerrar la tabla y
-- dejar la función es cerrar la puerta y dejar la ventana.
--
-- Las tres primeras están verificadas contra la base con la clave
-- pública, no son teóricas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. finance_snapshot: cuánto vale el stock no es dato público
--
-- Con la clave pública devolvía la plata inmovilizada en camisetas, las
-- unidades en casa y lo que falta cobrar de encargos. La usa una sola
-- pantalla del panel (/admin/sueldo), así que no hay motivo para que la
-- pueda llamar alguien de afuera.
--
-- No alcanza con sacarle el permiso a `anon`: el alta de cuentas está
-- abierta, así que cualquiera puede registrarse y quedar `authenticated`.
-- Por eso la función además se pregunta quién la está llamando.
-- ---------------------------------------------------------------------
create or replace function public.finance_snapshot()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case when public.is_admin() then jsonb_build_object(
    'inventory_cost', coalesce((
      select sum(
        greatest(0, v.stock_physical - v.stock_reserved - coalesce(v.encargo_reserved,0)) *
        (coalesce(nullif(v.variant_cost,0), p.unit_cost, 0) + coalesce(p.packaging_cost,0)))
      from product_variants v join products p on p.id = v.product_id
      where v.active), 0),
    'inventory_units', coalesce((
      select sum(greatest(0, v.stock_physical - v.stock_reserved - coalesce(v.encargo_reserved,0)))
      from product_variants v where v.active), 0),
    'pending_collect', coalesce((
      select sum( gr - least(coalesce(e.paid_amount,0), gr) )
      from encargos e
      join (select encargo_id, sum(quantity*sale_price) gr from encargo_items group by 1) t on t.encargo_id=e.id
      where e.status <> 'cancelado'
        and coalesce(e.payment_status, case when e.paid then 'paid' else 'unpaid' end) <> 'paid'), 0)
  ) end;
$function$;

revoke all on function public.finance_snapshot() from public, anon;
grant execute on function public.finance_snapshot() to authenticated;

-- ---------------------------------------------------------------------
-- 2. catalog_demand: lo que busca la gente tampoco
--
-- Devolvía qué equipos y años busca la gente, qué búsquedas se van sin
-- resultado y cuáles terminan en encargo. Eso es exactamente lo que le
-- sirve a alguien que quiera vender lo mismo: qué se pide y qué no
-- estamos pudiendo conseguir. La usa /admin/demanda, nadie más.
-- ---------------------------------------------------------------------
create or replace function public.catalog_demand(p_days integer default 30)
returns table(equipo text, anio text, busquedas bigint, sin_resultado bigint,
              encargos bigint, ultima timestamp with time zone, ejemplos text[])
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    coalesce(nullif(btrim(s.understood->>'equipo'), ''), '(no identificado)') as equipo,
    nullif(btrim(s.understood->>'anio'), '')                                  as anio,
    count(*)                                        as busquedas,
    count(*) filter (where s.matched_count = 0)     as sin_resultado,
    count(*) filter (where s.became_request)        as encargos,
    max(s.created_at)                               as ultima,
    (array_agg(distinct s.query))[1:3]              as ejemplos
  from public.catalog_searches s
  where public.is_admin()
    and s.created_at >= now() - make_interval(days => greatest(1, p_days))
  group by 1, 2
  order by count(*) filter (where s.matched_count = 0) desc, count(*) desc;
$function$;

revoke all on function public.catalog_demand(integer) from public, anon;
grant execute on function public.catalog_demand(integer) to authenticated;

-- ---------------------------------------------------------------------
-- 3. auth_email_for_username: que el usuario no revele el mail
--
-- Existe para poder entrar al panel escribiendo el usuario en vez del
-- mail: el formulario resuelve uno y después entra con el otro. El
-- problema es que resolvía para cualquiera — con la clave pública,
-- `cosov26` devolvía el mail del dueño. Eso es media credencial
-- servida, y encima una dirección concreta a la que apuntar.
--
-- Ahora hay que mandar también la contraseña, y se verifica contra el
-- hash de Supabase antes de contestar. Deja de ser un traductor de
-- usuarios a mails: el que ya sabe la contraseña no se entera de nada
-- que no pudiera averiguar entrando, y el que no, no se entera de nada.
--
-- Se borra la versión de un solo argumento: si quedara, seguiría siendo
-- llamable y no habríamos cerrado nada.
-- ---------------------------------------------------------------------
drop function if exists public.auth_email_for_username(text);

create or replace function public.auth_email_for_username(p_username text, p_password text)
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select p.email
    from public.profiles p
    join auth.users u on u.id = p.id
   where lower(p.username) = lower(btrim(p_username))
     and p.active
     and u.encrypted_password is not null
     and extensions.crypt(p_password, u.encrypted_password) = u.encrypted_password
   limit 1;
$function$;

revoke all on function public.auth_email_for_username(text, text) from public;
grant execute on function public.auth_email_for_username(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Que el default de `role` no sea uno que entra al panel
--
-- `profiles.role` venía con default 'viewer', y 'viewer' pasa el control
-- de `is_admin()`: lee pedidos, clientes, pagos, gastos, todo.
--
-- Hoy no es explotable: `profiles` tiene RLS sin política de INSERT, y
-- el trigger de alta (`handle_new_user`) escribe 'customer' a propósito.
-- O sea que el default no se usa nunca. Pero es una trampa esperando:
-- el día que alguien agregue una política de INSERT, o inserte una fila
-- sin poner el rol, esa cuenta entra al panel sola y sin ruido.
--
-- El default pasa a ser el rol que no ve nada. El staff se sigue
-- promoviendo a mano, que es como estaba pensado.
-- ---------------------------------------------------------------------
alter table public.profiles alter column role set default 'customer'::user_role;
