-- =====================================================================
-- CASACA DE CANCHA — Quién está en la página ahora mismo, y qué hace
--
-- Dos tablas:
--   * site_sessions: una fila por visitante, con dónde está PARADO ahora.
--     Se pisa a cada latido, así que no crece con el tiempo de visita.
--   * site_events: el recorrido, una fila por paso. De acá salen las
--     estadísticas.
--
-- No se guarda nada personal: un id anónimo que vive en el navegador de
-- la persona, la ruta, de dónde vino y si es celular o compu. Ni nombre,
-- ni mail, ni IP. Lo único que identifica a alguien es el número de
-- pedido, y recién cuando ya compró.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Quién está ahora
-- ---------------------------------------------------------------------
create table if not exists public.site_sessions (
  id            text primary key,          -- id anónimo, lo genera el navegador
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  path          text,                      -- en qué página está parado
  label         text,                      -- cómo se llama esa página
  device        text,                      -- 'movil' | 'escritorio'
  referrer      text,                      -- de dónde entró
  utm_source    text,
  -- En qué parte del camino está. Se calcula del lado del cliente porque
  -- es lo único que sabe si tiene algo en el carrito.
  stage         text not null default 'mirando',
  cart_items    int not null default 0,
  cart_value    numeric not null default 0,
  pages         int not null default 1,    -- cuántas páginas vio
  order_number  text                       -- si terminó comprando
);

create index if not exists site_sessions_last_seen_idx on public.site_sessions (last_seen desc);
create index if not exists site_sessions_first_seen_idx on public.site_sessions (first_seen desc);

-- ---------------------------------------------------------------------
-- El recorrido
-- ---------------------------------------------------------------------
create table if not exists public.site_events (
  id          bigserial primary key,
  session_id  text not null,
  kind        text not null,               -- ver 'kinds' abajo
  path        text,
  label       text,
  value       numeric,                     -- plata, cuando aplica
  device      text,
  referrer    text,
  utm_source  text,
  created_at  timestamptz not null default now()
);

create index if not exists site_events_created_idx on public.site_events (created_at desc);
create index if not exists site_events_session_idx on public.site_events (session_id, created_at);
create index if not exists site_events_kind_idx on public.site_events (kind, created_at desc);

-- kinds:
--   visita         entró a una página
--   producto       abrió una ficha
--   al_carrito     agregó algo
--   checkout       llegó al checkout
--   compra         confirmó el pedido
--   busqueda       usó el buscador
--   suscripcion    dejó el mail en el popup

-- ---------------------------------------------------------------------
-- RLS: el storefront escribe por RPC y no lee nada. El admin lee todo.
-- ---------------------------------------------------------------------
alter table public.site_sessions enable row level security;
alter table public.site_events  enable row level security;

drop policy if exists admin_read_site_sessions on public.site_sessions;
create policy admin_read_site_sessions on public.site_sessions
  for select using (public.is_admin());

drop policy if exists admin_read_site_events on public.site_events;
create policy admin_read_site_events on public.site_events
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- El latido
--
-- Una sola función para todo: la manda el navegador cada vez que pasa
-- algo y cada 20 segundos mientras la pestaña está a la vista.
--
-- Un latido sin `p_kind` solo corre el reloj: no deja evento. Si no, una
-- persona que deja la pestaña abierta media hora generaría 90 filas de
-- nada y ensuciaría las estadísticas.
-- ---------------------------------------------------------------------
create or replace function public.track_hit(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    text := nullif(left(trim(coalesce(p->>'sid', '')), 40), '');
  v_kind  text := nullif(p->>'kind', '');
  v_path  text := left(coalesce(p->>'path', ''), 200);
  v_label text := left(coalesce(p->>'label', ''), 120);
  v_dev   text := case when p->>'device' = 'movil' then 'movil' else 'escritorio' end;
  v_ref   text := left(coalesce(p->>'referrer', ''), 200);
  v_utm   text := left(coalesce(p->>'utm', ''), 60);
  v_stage text := coalesce(nullif(p->>'stage', ''), 'mirando');
begin
  -- Sin id no hay a quién contarle esto. Se descarta en silencio: el
  -- storefront no tiene que romperse porque falle el tracking.
  if v_id is null then
    return;
  end if;

  if v_stage not in ('mirando', 'carrito', 'checkout', 'compro') then
    v_stage := 'mirando';
  end if;

  insert into public.site_sessions as s (
    id, path, label, device, referrer, utm_source, stage,
    cart_items, cart_value, order_number
  ) values (
    v_id, v_path, v_label, v_dev, v_ref, nullif(v_utm, ''), v_stage,
    greatest(0, coalesce((p->>'cart_items')::int, 0)),
    greatest(0, coalesce((p->>'cart_value')::numeric, 0)),
    nullif(p->>'order_number', '')
  )
  on conflict (id) do update set
    last_seen  = now(),
    path       = excluded.path,
    label      = excluded.label,
    stage      = excluded.stage,
    cart_items = excluded.cart_items,
    cart_value = excluded.cart_value,
    -- El referrer real es el de la ENTRADA. Después de la primera página
    -- el navegador manda la página anterior del propio sitio, que no dice
    -- de dónde vino la persona.
    referrer   = coalesce(nullif(s.referrer, ''), excluded.referrer),
    utm_source = coalesce(s.utm_source, excluded.utm_source),
    order_number = coalesce(excluded.order_number, s.order_number),
    pages      = s.pages + (case when v_kind = 'visita' then 1 else 0 end)
  ;

  if v_kind is not null then
    insert into public.site_events (
      session_id, kind, path, label, value, device, referrer, utm_source
    ) values (
      v_id, v_kind, v_path, v_label,
      nullif((p->>'value')::numeric, 0), v_dev, nullif(v_ref, ''), nullif(v_utm, '')
    );
  end if;
end;
$$;

revoke all on function public.track_hit(jsonb) from public;
grant execute on function public.track_hit(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Quién hay ahora
--
-- "Ahora" son los últimos 90 segundos: el navegador late cada 20, así que
-- con 90 aguanta un par de latidos perdidos sin que la persona
-- desaparezca de la pantalla y vuelva a aparecer.
-- ---------------------------------------------------------------------
create or replace function public.live_visitors()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with vivos as (
    select * from public.site_sessions
     where last_seen > now() - interval '90 seconds'
     order by last_seen desc
     limit 200
  ),
  con_ruta as (
    select v.*,
           -- Las últimas páginas que tocó, para ver el recorrido.
           coalesce((
             select jsonb_agg(jsonb_build_object(
                      'kind', e.kind, 'path', e.path, 'label', e.label,
                      'at', e.created_at))
               from (select * from public.site_events e2
                      where e2.session_id = v.id
                      order by e2.created_at desc limit 8) e
           ), '[]'::jsonb) as recorrido
      from vivos v
  )
  select jsonb_build_object(
    'ahora', (select count(*) from vivos),
    'en_checkout', (select count(*) from vivos where stage = 'checkout'),
    'con_carrito', (select count(*) from vivos where cart_items > 0),
    'valor_en_carritos', coalesce((select sum(cart_value) from vivos where cart_items > 0), 0),
    'visitantes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'path', path, 'label', label, 'device', device,
        'referrer', referrer, 'utm_source', utm_source, 'stage', stage,
        'cart_items', cart_items, 'cart_value', cart_value, 'pages', pages,
        'order_number', order_number,
        'first_seen', first_seen, 'last_seen', last_seen,
        'recorrido', recorrido
      ) order by last_seen desc)
      from con_ruta
    ), '[]'::jsonb)
  )
  where public.is_admin();
$$;

revoke all on function public.live_visitors() from public;
grant execute on function public.live_visitors() to authenticated;

-- De dónde vino, en criollo. Un referrer vacío es tráfico directo.
create or replace function public.origen_de(p text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(p, '') = '' then 'Directo'
    when p ilike '%instagram%' then 'Instagram'
    when p ilike '%facebook%' or p ilike '%fb.%' then 'Facebook'
    when p ilike '%google%' then 'Google'
    when p ilike '%tiktok%' then 'TikTok'
    when p ilike '%whatsapp%' or p ilike '%wa.me%' then 'WhatsApp'
    when p ilike '%casacadecancha%' then 'Directo'
    else coalesce(nullif(split_part(regexp_replace(p, '^https?://(www\.)?', ''), '/', 1), ''), 'Directo')
  end;
$$;

-- ---------------------------------------------------------------------
-- Las estadísticas
--
-- El embudo se cuenta por PERSONAS, no por eventos: alguien que agrega
-- tres camisetas al carrito es una persona que llegó al carrito, no tres.
-- ---------------------------------------------------------------------
create or replace function public.traffic_stats(p_days int default 7)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with rango as (
    select now() - (greatest(1, least(coalesce(p_days, 7), 90)) || ' days')::interval as desde
  ),
  ev as (
    select e.* from public.site_events e, rango r where e.created_at >= r.desde
  ),
  ses as (
    select s.* from public.site_sessions s, rango r where s.first_seen >= r.desde
  )
  select jsonb_build_object(
    'dias', greatest(1, least(coalesce(p_days, 7), 90)),
    'visitantes', (select count(*) from ses),
    'paginas_vistas', (select count(*) from ev where kind = 'visita'),
    -- Embudo, por personas
    'embudo', jsonb_build_object(
      'entraron',  (select count(*) from ses),
      'vieron_producto', (select count(distinct session_id) from ev where kind = 'producto'),
      'al_carrito',      (select count(distinct session_id) from ev where kind = 'al_carrito'),
      'checkout',        (select count(distinct session_id) from ev where kind = 'checkout'),
      'compraron',       (select count(distinct session_id) from ev where kind = 'compra')
    ),
    'por_dia', coalesce((
      select jsonb_agg(jsonb_build_object('dia', d, 'visitantes', n) order by d)
        from (select date_trunc('day', first_seen)::date d, count(*) n
                from ses group by 1) x
    ), '[]'::jsonb),
    'por_hora', coalesce((
      select jsonb_agg(jsonb_build_object('hora', h, 'visitantes', n) order by h)
        from (select extract(hour from first_seen at time zone 'America/Argentina/Buenos_Aires')::int h,
                     count(*) n from ses group by 1) x
    ), '[]'::jsonb),
    'productos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'label', v.label, 'path', v.path,
               'vistas', v.n, 'al_carrito', coalesce(c.n, 0)) order by v.n desc)
        from (select label, min(path) path, count(*) n
                from ev where kind = 'producto' and coalesce(label, '') <> ''
               group by label order by count(*) desc limit 15) v
        left join (select label, count(*) n from ev
                    where kind = 'al_carrito' and coalesce(label, '') <> ''
                   group by label) c on c.label = v.label
    ), '[]'::jsonb),
    'origen', coalesce((
      select jsonb_agg(jsonb_build_object('de', de, 'visitantes', n) order by n desc)
        from (select coalesce(nullif(utm_source, ''), origen_de(referrer)) de, count(*) n
                from ses group by 1 order by count(*) desc limit 10) x
    ), '[]'::jsonb),
    'dispositivos', coalesce((
      select jsonb_agg(jsonb_build_object('device', device, 'visitantes', n) order by n desc)
        from (select coalesce(device, 'escritorio') device, count(*) n from ses group by 1) x
    ), '[]'::jsonb),
    'busquedas', coalesce((
      select jsonb_agg(jsonb_build_object('texto', label, 'veces', n) order by n desc)
        from (select label, count(*) n from ev where kind = 'busqueda' and coalesce(label, '') <> ''
               group by label order by count(*) desc limit 15) x
    ), '[]'::jsonb)
  )
  where public.is_admin();
$$;

revoke all on function public.traffic_stats(int) from public;
grant execute on function public.traffic_stats(int) to authenticated;

-- ---------------------------------------------------------------------
-- Limpieza: el detalle fino no sirve para siempre y ocupa.
-- Los eventos se guardan 90 días; las sesiones muertas, 90 también.
-- ---------------------------------------------------------------------
create or replace function public.purge_traffic()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.site_events   where created_at < now() - interval '90 days';
  delete from public.site_sessions where last_seen  < now() - interval '90 days';
$$;
