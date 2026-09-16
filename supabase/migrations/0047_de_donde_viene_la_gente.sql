-- =====================================================================
-- CASACA DE CANCHA — Que "de dónde viene la gente" se pueda leer
--
-- El panel mostraba "ig 5" e "Instagram 2" como si fueran dos fuentes
-- distintas. Es la misma: los links que llevan `?utm_source=ig` usaban
-- ese texto crudo, y los que no traen utm se normalizaban por el
-- referrer a "Instagram".
--
-- Con números chicos eso no es un detalle: 5 y 2 por separado parecen
-- nada, juntos son 7 de 9 visitas con origen conocido. La decisión de
-- dónde poner el esfuerzo sale de ahí.
-- =====================================================================

-- ---------------------------------------------------------------------
-- origen_de ahora entiende las dos cosas: una URL de referencia y una
-- etiqueta utm escrita a mano.
--
-- Las etiquetas cortas son las que se usan en los links de la bio y en
-- las historias: ig, fb, wsp. Se comparan enteras y no por contenido —
-- "ig" como pedazo aparece en cualquier palabra ("digital"), y quedaría
-- todo clasificado como Instagram.
-- ---------------------------------------------------------------------
create or replace function public.origen_de(p text)
returns text
language sql
immutable
as $function$
  with t as (select lower(btrim(coalesce(p, ''))) as v)
  select case
    when (select v from t) = '' then 'Directo'

    -- Etiquetas utm escritas a mano, comparadas enteras.
    when (select v from t) in ('ig','instagram','igstories','ig_stories','story','stories','bio','linkinbio')
      then 'Instagram'
    when (select v from t) in ('fb','facebook','meta') then 'Facebook'
    when (select v from t) in ('wsp','wpp','whatsapp','wa') then 'WhatsApp'
    when (select v from t) in ('tt','tiktok') then 'TikTok'
    when (select v from t) in ('google','goog','adwords','gads') then 'Google'
    when (select v from t) in ('directo','direct','none','(direct)') then 'Directo'

    -- URLs de referencia.
    when (select v from t) like '%instagram%' then 'Instagram'
    when (select v from t) like '%facebook%' or (select v from t) like '%fb.%' then 'Facebook'
    when (select v from t) like '%google%' then 'Google'
    when (select v from t) like '%tiktok%' then 'TikTok'
    when (select v from t) like '%whatsapp%' or (select v from t) like '%wa.me%' then 'WhatsApp'
    when (select v from t) like '%casacadecancha%' then 'Directo'

    -- Lo que no se reconoce: el dominio pelado, o el texto tal cual.
    else coalesce(
      nullif(split_part(regexp_replace((select v from t), '^https?://(www\.)?', ''), '/', 1), ''),
      'Directo')
  end;
$function$;

-- ---------------------------------------------------------------------
-- Y que las estadísticas lo usen TAMBIÉN para el utm, que era el que se
-- colaba sin normalizar.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.traffic_stats(p_days integer DEFAULT 7)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with ses as (
    select * from public.site_sessions
     where public.is_admin()
       and first_seen >= now() - make_interval(days => greatest(1, p_days))
  ),
  ev as (
    select * from public.site_events
     where public.is_admin()
       and created_at >= now() - make_interval(days => greatest(1, p_days))
  )
  select jsonb_build_object(
    'visitantes', (select count(*) from ses),
    'paginas',    (select count(*) from ev where kind = 'visita'),
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
    -- El utm también pasa por origen_de: antes entraba crudo y "ig" quedaba
    -- separado de "Instagram", que es lo mismo.
    'origen', coalesce((
      select jsonb_agg(jsonb_build_object('de', de, 'visitantes', n) order by n desc)
        from (select public.origen_de(coalesce(nullif(utm_source, ''), referrer)) de, count(*) n
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
  );
$function$;
