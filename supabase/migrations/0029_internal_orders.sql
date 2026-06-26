-- Pedidos internos entre vendedores: uno le pide camisetas al otro para sus encargos.
create table if not exists public.internal_orders (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null,   -- quien pide (para cubrir SUS encargos)
  provider_id uuid not null,    -- a quien le pide (sale de SU stock)
  product text not null default '—',
  size text,
  quantity integer not null default 1,
  unit_cost numeric not null default 0,
  status text not null default 'pendiente' check (status in ('pendiente','entregado')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists internal_orders_requester_idx on public.internal_orders(requester_id);
create index if not exists internal_orders_provider_idx on public.internal_orders(provider_id);

alter table public.internal_orders enable row level security;
drop policy if exists staff_read_internal_orders on public.internal_orders;
create policy staff_read_internal_orders on public.internal_orders for select using (is_staff_writer());
drop policy if exists staff_write_internal_orders on public.internal_orders;
create policy staff_write_internal_orders on public.internal_orders for all using (is_staff_writer()) with check (is_staff_writer());
