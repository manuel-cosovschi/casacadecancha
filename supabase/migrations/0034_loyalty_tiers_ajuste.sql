-- =====================================================================
-- CASACA DE CANCHA — Umbral y escalones ajustados al catálogo real
--
-- Los valores originales (umbral $100.000, tope 20%) se eligieron antes de
-- mirar los precios y los costos de verdad. Con el catálogo en la mano no
-- cierran ninguno de los dos.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Umbral: $100.000 -> $30.000
-- ---------------------------------------------------------------------
-- Las camisetas van de $31.111 a $65.000. Con el umbral en $100.000 hacían
-- falta DOS en un mismo pedido para que la compra contara, así que quien
-- compraba de a una no acumulaba nunca — comprara una vez o diez. De los 6
-- pedidos reales que había, el más grande fue de $60.000: nadie calificó nunca.
--
-- El umbral existe para que una compra chica no cuente como compra. En este
-- catálogo no hay compras chicas, así que va apenas por debajo de la más
-- barata: cualquier camiseta cuenta.

-- ---------------------------------------------------------------------
-- Tope: 20% -> 15%
-- ---------------------------------------------------------------------
-- Los márgenes reales van del 17% al 59%. Al 20%, dos productos quedaban
-- por debajo del costo:
--
--   $65.000 (costo $52.468) -> al 20% se cobra $52.000  = pierde $468
--   $60.000 (costo $49.865) -> al 20% se cobra $48.000  = pierde $1.865
--
-- Al 15% el peor caso deja $2.782 de ganancia. Los escalones intermedios
-- pasan a 10 / 12 / 15 para que la escalera siga teniendo tres peldaños.

update public.loyalty_config
   set min_order_amount = 30000,
       tier1_orders = 1, tier1_percent = 10,
       tier2_orders = 2, tier2_percent = 12,
       tier3_orders = 3, tier3_percent = 15
 where id = true;

-- Los mismos valores como default, para que una base nueva arranque igual.
alter table public.loyalty_config
  alter column min_order_amount set default 30000,
  alter column tier3_percent    set default 15,
  alter column tier2_percent    set default 12;
