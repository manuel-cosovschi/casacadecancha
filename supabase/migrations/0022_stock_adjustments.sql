-- Ajustes manuales de stock por modelo y talle (correcciones en la sección Encargos).
create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references public.product_variants(id) on delete set null,
  product text not null default '—',
  size text,
  delta integer not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists stock_adjustments_created_idx on public.stock_adjustments(created_at desc);

alter table public.stock_adjustments enable row level security;

drop policy if exists admin_read_stock_adjustments on public.stock_adjustments;
create policy admin_read_stock_adjustments on public.stock_adjustments
  for select using (is_admin());

drop policy if exists staff_write_stock_adjustments on public.stock_adjustments;
create policy staff_write_stock_adjustments on public.stock_adjustments
  for all using (is_staff_writer()) with check (is_staff_writer());
