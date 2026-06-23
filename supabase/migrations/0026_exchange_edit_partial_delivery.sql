-- Para poder revertir/editar un cambio de forma confiable.
alter table public.encargo_exchanges add column if not exists item_id uuid;        -- línea que quedó con el NUEVO valor
alter table public.encargo_exchanges add column if not exists source_item_id uuid;  -- línea original (en cambios parciales)
alter table public.encargo_exchanges add column if not exists old_unit_cost numeric;

-- Marcar entregas parciales en un encargo.
alter table public.encargos add column if not exists partial_delivery boolean not null default false;
