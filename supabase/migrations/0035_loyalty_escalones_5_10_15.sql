-- =====================================================================
-- CASACA DE CANCHA — Escalones 10/12/15 -> 5/10/15
--
-- Decisión del dueño, tomada al ver la escalera armada: prefiere que los
-- peldaños sean redondos (5, 10, 15) y que el primero cueste menos.
--
-- El umbral ($30.000) y el tope (15%) no se tocan: el tope ya estaba puesto
-- en el máximo que los márgenes bancan sin vender por debajo del costo.
-- =====================================================================

update public.loyalty_config
   set tier1_orders = 1, tier1_percent = 5,
       tier2_orders = 2, tier2_percent = 10,
       tier3_orders = 3, tier3_percent = 15
 where id = true;

alter table public.loyalty_config
  alter column tier1_percent set default 5,
  alter column tier2_percent set default 10;
