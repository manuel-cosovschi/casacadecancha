-- =====================================================================
-- CASACA DE CANCHA — Búsquedas del catálogo
--
-- Guarda qué busca la gente y si lo encontró. Lo importante no es el
-- historial: es la lista de lo que buscan y NO tenés, que es exactamente
-- la lista de lo que conviene importar.
-- =====================================================================

create table if not exists public.catalog_searches (
  id            uuid primary key default gen_random_uuid(),
  query         text not null,
  -- Qué entendió el buscador: equipo, año, versión, jugador.
  understood    jsonb,
  -- Slugs que devolvió, en orden. Vacío = no encontró nada.
  matched_slugs text[] not null default '{}',
  matched_count int not null default 0,
  -- true si esa búsqueda terminó en un pedido de encargo.
  became_request boolean not null default false,
  source        text,
  created_at    timestamptz not null default now()
);

create index if not exists catalog_searches_created_idx
  on public.catalog_searches (created_at desc);
-- El índice que importa: las que no encontraron nada.
create index if not exists catalog_searches_sin_resultado_idx
  on public.catalog_searches (created_at desc) where matched_count = 0;

alter table public.catalog_searches enable row level security;

-- Nadie lee esto desde la tienda: son datos del negocio.
drop policy if exists staff_read_catalog_searches on public.catalog_searches;
create policy staff_read_catalog_searches on public.catalog_searches
  for select using (public.is_admin());

drop policy if exists staff_write_catalog_searches on public.catalog_searches;
create policy staff_write_catalog_searches on public.catalog_searches
  for all using (public.is_staff_writer()) with check (public.is_staff_writer());


-- ---------------------------------------------------------------------
-- Alta desde la tienda
-- ---------------------------------------------------------------------
-- El storefront no puede escribir la tabla directo (no tiene por qué), así
-- que entra por acá. Devuelve el id para poder marcar después si la
-- búsqueda terminó en un encargo.
create or replace function public.log_catalog_search(
  p_query    text,
  p_slugs    text[] default '{}',
  p_understood jsonb default null,
  p_source   text default 'catalogo'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query text := nullif(btrim(p_query), '');
  v_id uuid;
begin
  if v_query is null or length(v_query) > 300 then
    return null;
  end if;

  insert into public.catalog_searches (query, understood, matched_slugs, matched_count, source)
  values (
    left(v_query, 300),
    p_understood,
    coalesce(p_slugs, '{}'),
    coalesce(array_length(p_slugs, 1), 0),
    left(coalesce(p_source, 'catalogo'), 40)
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- Marca que esa búsqueda terminó en un encargo pedido.
create or replace function public.mark_search_became_request(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.catalog_searches set became_request = true where id = p_id;
$$;


-- ---------------------------------------------------------------------
-- El panel: qué busca la gente que no tenés
-- ---------------------------------------------------------------------
-- Agrupa por lo que el buscador entendió (equipo + año) en vez de por el
-- texto crudo, así "camiseta del milan de kaka" y "Milán 2007" cuentan
-- juntas en vez de aparecer como dos búsquedas distintas.
create or replace function public.catalog_demand(p_days int default 30)
returns table (
  equipo        text,
  anio          text,
  busquedas     bigint,
  sin_resultado bigint,
  encargos      bigint,
  ultima        timestamptz,
  ejemplos      text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(nullif(btrim(s.understood->>'equipo'), ''), '(no identificado)') as equipo,
    nullif(btrim(s.understood->>'anio'), '')                                  as anio,
    count(*)                                        as busquedas,
    count(*) filter (where s.matched_count = 0)     as sin_resultado,
    count(*) filter (where s.became_request)        as encargos,
    max(s.created_at)                               as ultima,
    (array_agg(distinct s.query))[1:3]              as ejemplos
  from public.catalog_searches s
  where s.created_at >= now() - make_interval(days => greatest(1, p_days))
  group by 1, 2
  order by count(*) filter (where s.matched_count = 0) desc, count(*) desc;
$$;

grant execute on function public.log_catalog_search(text, text[], jsonb, text) to anon, authenticated;
grant execute on function public.mark_search_became_request(uuid)             to anon, authenticated;
grant execute on function public.catalog_demand(int)                          to authenticated;
