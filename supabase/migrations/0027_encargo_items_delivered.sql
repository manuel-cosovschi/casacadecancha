-- Marcar qué ítems de un encargo ya se entregaron (entregas parciales).
alter table public.encargo_items add column if not exists delivered boolean not null default false;
