/**
 * Datos del programa de fidelidad, sin nada del lado del servidor.
 *
 * Vive separado de `loyalty.ts` porque eso importa `crypto` para firmar los
 * códigos, y el carrito —que es un componente de cliente— necesita los
 * escalones para dibujar la barra de progreso. Meter `crypto` en el bundle del
 * navegador por una constante no tiene sentido.
 */
export const LOYALTY = {
  active: true,
  prefix: 'FID-',
  /** Mínimo de la compra (sobre el subtotal) para que sume al programa. */
  minOrderAmount: 100_000,
  /** Escalones: a partir de N compras calificadas, tal porcentaje. */
  tiers: [
    { orders: 3, percent: 20 },
    { orders: 2, percent: 15 },
    { orders: 1, percent: 10 },
  ],
  windowDays: 60,
};

/** Porcentaje que corresponde a esa cantidad de compras calificadas. */
export function percentForOrders(orders: number): number {
  if (!LOYALTY.active) return 0;
  for (const t of LOYALTY.tiers) {
    if (orders >= t.orders) return t.percent;
  }
  return 0;
}

export interface LoyaltyStatus {
  orders: number;
  percent: number;
  /** Compras que faltan para el próximo escalón, o null si ya está al tope. */
  toNext: number | null;
  nextPercent: number | null;
}

/** Arma el estado a mostrar al cliente a partir de su cantidad de compras. */
export function statusFromOrders(orders: number): LoyaltyStatus {
  const percent = percentForOrders(orders);
  const higher = [...LOYALTY.tiers]
    .sort((a, b) => a.orders - b.orders)
    .find((t) => t.orders > orders);
  return {
    orders,
    percent,
    toNext: higher ? higher.orders - orders : null,
    nextPercent: higher ? higher.percent : null,
  };
}

/** El escalón más bajo: lo que gana quien todavía no compró nunca. */
export const FIRST_TIER_PERCENT =
  [...LOYALTY.tiers].sort((a, b) => a.orders - b.orders)[0]?.percent ?? 0;
