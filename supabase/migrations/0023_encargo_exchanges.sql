-- Cambios (otro talle/modelo) pedidos sobre un encargo, con estado pendiente/hecho.
create table if not exists public.encargo_exchanges (
  id uuid primary key default gen_random_uuid(),
  encargo_id uuid not null references public.encargos(id) on delete cascade,
  old_product text,
  old_size text,
  old_variant_id uuid,
  new_product text not null,
  new_size text,
  new_variant_id uuid,
  quantity integer not null default 1,
  status text not null default 'pendiente' check (status in ('pendiente','hecho')),
  created_at timestamptz not null default now()
);

create index if not exists encargo_exchanges_encargo_idx on public.encargo_exchanges(encargo_id);

alter table public.encargo_exchanges enable row level security;

drop policy if exists admin_read_encargo_exchanges on public.encargo_exchanges;
create policy admin_read_encargo_exchanges on public.encargo_exchanges
  for select using (is_admin());

drop policy if exists staff_write_encargo_exchanges on public.encargo_exchanges;
create policy staff_write_encargo_exchanges on public.encargo_exchanges
  for all using (is_staff_writer()) with check (is_staff_writer());
