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
  /**
   * Mínimo de la compra (sobre el subtotal) para que sume al programa.
   *
   * Está apenas por debajo de la camiseta más barata del catálogo ($31.111) a
   * propósito: el umbral existe para que una compra chica no cuente como
   * compra, y acá no hay compras chicas. Con el valor anterior ($100.000)
   * hacían falta dos camisetas en un mismo pedido, así que quien compraba de a
   * una no acumulaba nunca — comprara una vez o diez.
   */
  minOrderAmount: 30_000,
  /**
   * Escalones: a partir de N compras calificadas, tal porcentaje.
   *
   * El tope es 15% y no 20% por los márgenes reales: al 20%, el de $65.000
   * (que cuesta $52.468) se cobraría $52.000, o sea a pérdida. Al 15% el peor
   * caso todavía deja ganancia.
   *
   * Estos valores tienen que coincidir con la tabla `loyalty_config` de la
   * base, que es la que manda para el descuento que se cobra. Acá se usan para
   * lo que se le muestra al cliente antes de que escriba su mail.
   */
  tiers: [
    { orders: 3, percent: 15 },
    { orders: 2, percent: 12 },
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

/**
 * Los escalones que vienen después del primero, de menor a mayor.
 *
 * Sale de `tiers` en vez de estar escrito a mano en la vista: si mañana se
 * cambian los porcentajes, los carteles se actualizan solos en vez de quedar
 * prometiendo un número viejo.
 */
export const HIGHER_TIER_PERCENTS = [...LOYALTY.tiers]
  .sort((a, b) => a.orders - b.orders)
  .filter((t) => t.percent > FIRST_TIER_PERCENT)
  .map((t) => t.percent);
