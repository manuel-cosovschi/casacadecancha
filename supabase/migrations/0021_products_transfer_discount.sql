-- Permite excluir productos del descuento por transferencia (precio fijo).
alter table public.products add column if not exists transfer_discount boolean not null default true;

-- Las importadas G5 se venden a precio fijo, sin descuento por transferencia.
update public.products set transfer_discount = false
where slug in (
  'camiseta-argentina-titular-2026-g5',
  'camiseta-argentina-suplente-2026-g5',
  'camiseta-argentina-titular-2026-ml-g5'
);
