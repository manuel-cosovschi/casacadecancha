-- Estado de pago de encargos: sin pagar / seña (50%) / pagado.
-- Permite registrar una seña del 50% que se acopla a facturación cobrada vs. pendiente.
alter table public.encargos add column if not exists payment_status text not null default 'unpaid';

-- Migrar datos existentes desde el booleano `paid`.
update public.encargos set payment_status = case when paid then 'paid' else 'unpaid' end;

-- Validar valores permitidos.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'encargos_payment_status_check'
  ) then
    alter table public.encargos
      add constraint encargos_payment_status_check
      check (payment_status in ('unpaid','deposit','paid'));
  end if;
end $$;
