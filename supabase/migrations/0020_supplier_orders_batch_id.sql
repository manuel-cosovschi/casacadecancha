-- Un pedido al proveedor puede agrupar varias líneas (productos/talles) bajo un mismo batch_id.
alter table public.supplier_orders add column if not exists batch_id uuid;

-- Backfill: cada fila existente queda como su propio pedido...
update public.supplier_orders set batch_id = id where batch_id is null;

-- ...salvo el lote G5 en camino, que se agrupa en un único pedido.
update public.supplier_orders
set batch_id = (
  select id from public.supplier_orders
  where supplier = 'China G5' and status = 'pedido'
  order by created_at, id limit 1
)
where supplier = 'China G5' and status = 'pedido';

alter table public.supplier_orders alter column batch_id set not null;
create index if not exists supplier_orders_batch_id_idx on public.supplier_orders(batch_id);
