-- Regalos / cortesías: camisetas que salieron del stock sin venta (pérdida = su costo).
create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid references public.product_variants(id) on delete set null,
  product text not null default '—',
  size text,
  quantity integer not null default 1,
  unit_cost numeric not null default 0,
  recipient text,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists gifts_created_idx on public.gifts(created_at desc);

alter table public.gifts enable row level security;

drop policy if exists admin_read_gifts on public.gifts;
create policy admin_read_gifts on public.gifts for select using (is_admin());

drop policy if exists staff_write_gifts on public.gifts;
create policy staff_write_gifts on public.gifts for all using (is_staff_writer()) with check (is_staff_writer());
