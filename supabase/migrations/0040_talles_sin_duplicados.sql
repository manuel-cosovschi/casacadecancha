-- =====================================================================
-- CASACA DE CANCHA — Un talle, una sola fila por producto
--
-- La Argentina 2006 Messi tenía TRES variantes "L": la original de julio y
-- dos creadas el 15/9 a las 15:08. En la ficha se veía
-- "L · L · S · M · L · XL · XXL": el talle repetido tres veces y el orden
-- roto, porque las nuevas quedaron con sort_order 0 y se fueron al
-- principio.
--
-- Dos cosas mal, y las dos se arreglan en la estructura:
--   1. nada impedía crear el mismo talle dos veces
--   2. el orden salía de un número escrito a mano en vez del talle
--
-- Esto junta el stock en la variante vieja —la que tiene el historial de
-- pedidos y movimientos—, borra las sobrantes, pone el índice único y
-- reacomoda los sort_order de todo el catálogo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Juntar el stock en la variante que se queda
--
-- Se queda la MÁS VIEJA, que es la que está referenciada por pedidos,
-- movimientos de inventario y avisos de stock. Borrar esa rompería el
-- historial; borrar las nuevas no rompe nada.
-- ---------------------------------------------------------------------
with rankeadas as (
  select id, product_id, lower(trim(size)) as talle, stock_physical,
         row_number() over (partition by product_id, lower(trim(size))
                            order by created_at, id) as rn
    from public.product_variants
),
sobrantes as (
  select * from rankeadas where rn > 1
),
sumado as (
  select product_id, talle, sum(stock_physical) as extra
    from sobrantes group by product_id, talle
)
update public.product_variants v
   set stock_physical = v.stock_physical + s.extra
  from sumado s, rankeadas r
 where r.id = v.id
   and r.rn = 1
   and r.product_id = s.product_id
   and r.talle = s.talle
   and s.extra > 0;

-- ---------------------------------------------------------------------
-- 2. Borrar las sobrantes, pero SOLO si no las referencia nada
--
-- Si alguna estuviera referenciada (no es el caso hoy), se desactiva en
-- lugar de borrarse: mejor una variante apagada que un pedido huérfano.
-- ---------------------------------------------------------------------
with rankeadas as (
  select id, row_number() over (partition by product_id, lower(trim(size))
                                order by created_at, id) as rn
    from public.product_variants
),
sobrantes as (select id from rankeadas where rn > 1),
libres as (
  select s.id from sobrantes s
   where not exists (select 1 from public.order_items         x where x.variant_id = s.id)
     and not exists (select 1 from public.supplier_orders     x where x.variant_id = s.id)
     and not exists (select 1 from public.stock_notifications x where x.variant_id = s.id)
     and not exists (select 1 from public.inventory_movements x where x.variant_id = s.id)
     and not exists (select 1 from public.stock_adjustments   x where x.variant_id = s.id)
     and not exists (select 1 from public.encargo_items       x where x.variant_id = s.id)
     and not exists (select 1 from public.gifts               x where x.variant_id = s.id)
)
delete from public.product_variants where id in (select id from libres);

-- Las que quedaron (referenciadas) se apagan para que no salgan en la ficha.
with rankeadas as (
  select id, row_number() over (partition by product_id, lower(trim(size))
                                order by created_at, id) as rn
    from public.product_variants
)
update public.product_variants
   set active = false
 where id in (select id from rankeadas where rn > 1);

-- ---------------------------------------------------------------------
-- 3. Que no pueda volver a pasar
--
-- Por `lower(trim(size))`: "L", "l" y " L " son el mismo talle y no tienen
-- que poder convivir.
-- ---------------------------------------------------------------------
create unique index if not exists product_variants_producto_talle_uq
  on public.product_variants (product_id, lower(trim(size)))
  where size is not null;

-- ---------------------------------------------------------------------
-- 4. Enderezar el orden de todo el catálogo
--
-- La página ya ordena por el talle y no por esta columna, así que esto es
-- para que el dato en la base también quede derecho: cualquier consulta
-- que ordene por `sort_order` sale bien sin saber de talles.
-- ---------------------------------------------------------------------
update public.product_variants
   set sort_order = case upper(trim(size))
     when 'XXS'  then 1
     when 'XS'   then 2
     when 'S'    then 3
     when 'M'    then 4
     when 'L'    then 5
     when 'XL'   then 6
     when 'XXL'  then 7
     when 'XXXL' then 8
     when '2XL'  then 9
     when '3XL'  then 10
     when '4XL'  then 11
     else 12
   end
 where size is not null;
