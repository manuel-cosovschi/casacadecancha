import { applyDiscount } from '@/lib/utils';
import type { Product } from '@/lib/types';

/**
 * Promo vigente sobre todo el catálogo.
 *
 * Vive en el código (y no en `store_settings`) para que viaje con el deploy y
 * se apague sola al vencer, sin depender de que alguien la desactive a mano.
 * Para cortarla antes, poné `active: false` y desplegá.
 */
export interface SiteSale {
  active: boolean;
  /** Porcentaje de descuento (0-100). */
  percent: number;
  /** Último instante en que la promo sigue viva, inclusive. ISO con offset. */
  ends_at: string;
  /** Texto corto para los carteles. */
  label: string;
}

export const SITE_SALE: SiteSale = {
  active: true,
  percent: 15,
  // Domingo 6/9/2026 a las 23:59:59 de Argentina (UTC-3).
  ends_at: '2026-09-06T23:59:59-03:00',
  label: '15% OFF EN TODO',
};

/**
 * Porcentaje vigente en un momento dado. Devuelve 0 si la promo está apagada,
 * vencida o mal configurada: ante la duda, no se descuenta nada.
 */
export function salePercentAt(now: Date = new Date(), sale: SiteSale = SITE_SALE): number {
  if (!sale?.active) return 0;
  const pct = Math.max(0, Math.min(100, Number(sale.percent) || 0));
  if (pct === 0) return 0;
  const ends = Date.parse(sale.ends_at);
  if (Number.isNaN(ends) || now.getTime() > ends) return 0;
  return pct;
}

/** Precio final con la promo aplicada (mismo redondeo que el resto de la tienda). */
export function salePrice(price: number, now?: Date): number {
  return applyDiscount(price, salePercentAt(now));
}

/**
 * Devuelve el producto con los precios de promo ya aplicados y el precio
 * original como `compare_at_price`, para que se muestre tachado y con el badge
 * de porcentaje en todas las vistas del storefront sin tocar los componentes.
 *
 * El precio real que se cobra lo recalcula el servidor en `createOrder`; esto
 * es la cara visible de esa misma cuenta.
 */
export function withSalePricing(product: Product, now?: Date): Product {
  const pct = salePercentAt(now);
  if (pct === 0) return product;

  const discounted = applyDiscount(product.price, pct);
  if (discounted >= product.price) return product;

  return {
    ...product,
    price: discounted,
    // Si ya venía con un precio tachado más alto, se respeta ese.
    compare_at_price: Math.max(product.price, product.compare_at_price ?? 0),
    variants: product.variants?.map((v) =>
      v.variant_price == null
        ? v
        : { ...v, variant_price: applyDiscount(v.variant_price, pct) },
    ),
  };
}
