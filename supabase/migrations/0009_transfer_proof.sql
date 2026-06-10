-- =====================================================================
-- CASACA DE CANCHA - Comprobantes de transferencia
-- =====================================================================
-- El cliente sube su comprobante en la web; el pedido pasa a "en revisión"
-- y el administrador lo valida y aprueba desde el dashboard.
-- =====================================================================

-- Bucket privado para comprobantes.
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

-- El cliente (anon) puede subir su comprobante; no puede listar ni leer.
drop policy if exists "Anon upload comprobantes" on storage.objects;
create policy "Anon upload comprobantes"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'comprobantes');

-- El staff puede leer (firmar URLs) y borrar.
drop policy if exists "Staff read comprobantes" on storage.objects;
create policy "Staff read comprobantes"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'comprobantes' and public.is_staff_writer());

drop policy if exists "Staff delete comprobantes" on storage.objects;
create policy "Staff delete comprobantes"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'comprobantes' and public.is_staff_writer());

-- RPC: el cliente envía el comprobante y el pedido pasa a "en revisión".
create or replace function public.submit_transfer_proof(p_order_number text, p_proof_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payments
    set proof_url = p_proof_url,
        status = 'payment_review'
    where order_id = (select id from public.orders where order_number = p_order_number);

  update public.orders
    set payment_status = 'payment_review'
    where order_number = p_order_number
      and payment_status = 'pending_payment';
end; $$;

revoke all on function public.submit_transfer_proof(text, text) from public;
grant execute on function public.submit_transfer_proof(text, text) to anon, authenticated;
