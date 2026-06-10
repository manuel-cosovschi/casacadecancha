-- =====================================================================
-- CASACA DE CANCHA - Cupones y atribución de envío en pedidos
-- =====================================================================

alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists coupon_discount numeric(12,2) not null default 0;

-- Incrementa el uso de una promoción de forma atómica.
create or replace function public.increment_promotion_use(p_code text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.promotions
  set used_count = used_count + 1
  where lower(code) = lower(p_code) and active = true;
end; $$;

-- Cupón de ejemplo (editable/eliminable desde el admin).
insert into public.promotions (name, type, code, percentage, active, minimum_amount)
select 'Cupón Mundial', 'coupon', 'MUNDIAL10', 10, true, 0
where not exists (select 1 from public.promotions where lower(code) = 'mundial10');
