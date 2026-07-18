-- Seguimiento de envío para pedidos de Mar del Plata.
alter table public.orders add column if not exists delivery_status text;
alter table public.orders add column if not exists delivery_updated_at timestamptz;
comment on column public.orders.delivery_status is 'Estado del envío MdP: preparando | en_camino | entregado';
