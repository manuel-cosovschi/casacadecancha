-- Monto cobrado de seña (parcial) en encargos. Permite señas personalizadas / pagos en partes.
alter table public.encargos add column if not exists paid_amount numeric not null default 0;
