-- =====================================================================
-- CASACA DE CANCHA — Los proveedores y los márgenes no son públicos
--
-- Barriendo TODAS las funciones que llama el panel aparecieron dos más
-- con el mismo problema que `finance_snapshot` y `catalog_demand`:
-- `security definer`, sin control de quién llama, y ejecutables con la
-- clave pública que viaja en el bundle.
--
-- Estas dos son las peores de la lista, porque no se trata de un número
-- suelto: es cómo funciona el negocio.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. purchase_recommendations: cuánto se gana con cada camiseta
--
-- Devolvía, por producto y talle, cuántas se vendieron, cuánta plata
-- entró y CUÁNTO SE GANÓ:
--
--   Camiseta Argentina Titular 2026 — XL · 5 vendidas · $230.000 · margen $79.275
--
-- Con eso cualquiera saca el precio de costo restando, sabe qué se vende
-- y qué está agotado. Es la lista de compras del negocio, servida.
-- ---------------------------------------------------------------------
create or replace function public.purchase_recommendations(p_days integer default 90)
returns table(product text, size text, sold integer, revenue numeric,
              margin numeric, stock integer, suggest integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with sales as (
    select ei.product as product, coalesce(ei.size,'') as size, ei.quantity as qty,
           ei.sale_price as price, ei.unit_cost as cost
    from encargo_items ei join encargos e on e.id = ei.encargo_id
    where public.is_admin()
      and e.status <> 'cancelado'
      and e.created_at >= now() - make_interval(days => p_days)
    union all
    select oi.product_name, coalesce(oi.size,''), oi.quantity, oi.unit_price, oi.unit_cost
    from order_items oi join orders o on o.id = oi.order_id
    where public.is_admin()
      and o.payment_status = 'paid'
      and o.created_at >= now() - make_interval(days => p_days)
  ),
  agg as (
    select lower(trim(product)) as pkey, lower(trim(coalesce(size,''))) as skey,
           max(product) as product, max(size) as size,
           sum(qty)::int as sold, sum(qty*price) as revenue, sum(qty*(price-cost)) as margin
    from sales group by 1,2
  ),
  stk as (
    select lower(trim(p.name)) as pkey, lower(trim(coalesce(v.size,''))) as skey,
           sum(greatest(0, v.stock_physical - v.stock_reserved - coalesce(v.encargo_reserved,0)))::int as avail
    from product_variants v join products p on p.id = v.product_id
    where v.active group by 1,2
  )
  select a.product, a.size, a.sold, a.revenue, a.margin,
         coalesce(s.avail,0) as stock,
         greatest(0, ceil(a.sold::numeric / (p_days/30.0) * 1.5) - coalesce(s.avail,0))::int as suggest
  from agg a left join stk s on s.pkey=a.pkey and s.skey=a.skey
  order by a.sold desc, a.margin desc;
$function$;

revoke all on function public.purchase_recommendations(integer) from public, anon;
grant execute on function public.purchase_recommendations(integer) to authenticated;

-- ---------------------------------------------------------------------
-- 2. supplier_ranking: con quién se trabaja y a cuánto
--
-- Devolvía la lista de proveedores CON NOMBRE —Vartan, Mdp FB,
-- Avellaneda 2969—, cuántas unidades se les compró, a qué costo
-- promedio y cuánto margen dejó cada uno.
--
-- Eso es la cadena de proveedores completa. Alguien que quiera vender lo
-- mismo no necesita averiguar nada: sabe a quién comprarle, a cuánto, y
-- a qué precio hay que ponerse para competir.
-- ---------------------------------------------------------------------
create or replace function public.supplier_ranking()
returns table(supplier text, products integer, units_ordered integer, avg_cost numeric,
              units_sold integer, margin numeric, demand integer,
              last_order timestamp with time zone, score numeric)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with sup_products as (
    select lower(trim(supplier)) as skey, lower(trim(product)) as pkey
    from supplier_orders
    where public.is_admin() and coalesce(trim(supplier),'') <> ''
    group by 1,2
  ),
  sup_agg as (
    select lower(trim(supplier)) as skey, max(supplier) as supplier,
           count(distinct lower(trim(product)))::int as products,
           sum(quantity)::int as units_ordered,
           round(avg(nullif(unit_cost,0))) as avg_cost,
           max(created_at) as last_order
    from supplier_orders
    where public.is_admin() and coalesce(trim(supplier),'') <> ''
    group by 1
  ),
  sales as (
    select lower(trim(ei.product)) as pkey, ei.quantity as qty,
           (ei.sale_price-ei.unit_cost)*ei.quantity as m
    from encargo_items ei join encargos e on e.id=ei.encargo_id where e.status <> 'cancelado'
    union all
    select lower(trim(oi.product_name)), oi.quantity, (oi.unit_price-oi.unit_cost)*oi.quantity
    from order_items oi join orders o on o.id=oi.order_id where o.payment_status='paid'
  ),
  sales_by_sup as (
    select sp.skey, sum(s.qty)::int as units_sold, sum(s.m) as margin
    from sup_products sp join sales s on s.pkey=sp.pkey group by 1
  ),
  demand as (
    select lower(trim(p.name)) as pkey, count(*)::int as cnt
    from stock_notifications sn
    join product_variants v on v.id=sn.variant_id
    join products p on p.id=v.product_id
    where not sn.notified group by 1
  ),
  demand_by_sup as (
    select sp.skey, sum(d.cnt)::int as demand
    from sup_products sp join demand d on d.pkey=sp.pkey group by 1
  )
  select a.supplier, a.products, a.units_ordered, a.avg_cost,
         coalesce(sb.units_sold,0), coalesce(sb.margin,0), coalesce(db.demand,0),
         a.last_order,
         round((coalesce(sb.units_sold,0) + coalesce(db.demand,0)*2 + coalesce(sb.margin,0)/50000.0)::numeric, 1) as score
  from sup_agg a
  left join sales_by_sup sb on sb.skey=a.skey
  left join demand_by_sup db on db.skey=a.skey
  order by score desc, units_sold desc;
$function$;

revoke all on function public.supplier_ranking() from public, anon;
grant execute on function public.supplier_ranking() to authenticated;
