import type { Product } from '@/lib/types';

/**
 * Promo sobre una línea puntual de productos, con precio fijo.
 *
 * Distinta de `SITE_SALE`, que es un porcentaje sobre todo el catálogo: acá se
 * fija un precio para una lista de productos. Vive en el código y no en la base
 * para que viaje con el deploy y se apague sola al vencer, sin depender de que
 * alguien la desactive a mano. Para cortarla antes, `active: false` y desplegar.
 *
 * NO SE ACUMULA. Los productos en promo quedan afuera de la base sobre la que
 * se calculan el cupón, el descuento de cliente y el de transferencia. Un
 * carrito mixto sí recibe esos descuentos, pero solo sobre lo que no está en
 * promo: la camiseta en promo ya tiene el suyo.
 */
export interface PromoLinea {
  active: boolean;
  /** Precio final de cada producto de la lista. */
  price: number;
  /** Precio de lista, solo para los carteles (el tachado sale del producto). */
  compare_price: number;
  /** Último instante en que sigue viva, inclusive. ISO con offset. */
  ends_at: string;
  /** Nombre de la promo, para los carteles. */
  label: string;
  /** Texto corto para el badge de la tarjeta. */
  badge: string;
  /** Slugs alcanzados. Solo estos: nada de adivinar por nombre. */
  slugs: string[];
}

export const PROMO_LINEA: PromoLinea = {
  active: true,
  price: 55_000,
  compare_price: 60_000,
  // Domingo 20/9/2026 a las 23:59:59 de Argentina (UTC-3).
  ends_at: '2026-09-20T23:59:59-03:00',
  label: 'SEMANA DE COPA',
  badge: 'SEMANA DE COPA',
  // La línea Icon completa. Va por slug y no por nombre: si mañana se renombra
  // un producto, es preferible que la promo no lo agarre a que agarre otro.
  slugs: [
    'camiseta-ajax-icon-importada',
    'camiseta-arsenal-icon-adidas',
    'camiseta-arsenal-icon-bordo-importada',
    'camiseta-juventus-icon-adidas',
    'camiseta-liverpool-icon-adidas',
    'camiseta-liverpool-icon-negra-importada',
    'camiseta-liverpool-icon-verde-importada',
    'camiseta-newcastle-icon-importada',
  ],
};

const enPromo = new Set(PROMO_LINEA.slugs);

/** ¿La promo está viva en este momento? */
export function promoLineaActiva(
  now: Date = new Date(),
  promo: PromoLinea = PROMO_LINEA,
): boolean {
  if (!promo?.active) return false;
  if (!(promo.price > 0)) return false;
  const ends = Date.parse(promo.ends_at);
  if (Number.isNaN(ends) || now.getTime() > ends) return false;
  return promo.slugs.length > 0;
}

/** ¿Este producto está en promo ahora? */
export function estaEnPromoLinea(slug: string, now?: Date): boolean {
  return promoLineaActiva(now) && enPromo.has(slug);
}

/** El precio de promo, o null si a ese producto no le corresponde. */
export function precioPromoLinea(
  slug: string,
  precioLista: number,
  now?: Date,
): number | null {
  if (!estaEnPromoLinea(slug, now)) return null;
  // Si el de lista ya es igual o menor, la promo no aporta nada y no se toca:
  // nunca se sube un precio por aplicar una promo.
  if (precioLista <= PROMO_LINEA.price) return null;
  return PROMO_LINEA.price;
}

/**
 * Producto con el precio de promo puesto y el de lista tachado.
 *
 * Se aplica en `sortProduct`, el único punto por el que el storefront lee
 * productos, así que el precio sale igual en el catálogo, la ficha y el
 * carrito. Lo que se cobra lo recalcula `createOrder`; esto es la cara visible
 * de esa misma cuenta.
 */
export function withPromoLinea(product: Product, now?: Date): Product {
  const precio = precioPromoLinea(product.slug, product.price, now);
  if (precio === null) return product;

  return {
    ...product,
    price: precio,
    promo_label: PROMO_LINEA.badge,
    compare_at_price: Math.max(product.price, product.compare_at_price ?? 0),
    // Los talles con precio propio también quedan al precio de promo: si no,
    // un talle especial se escaparía de la promo sin que nadie lo note.
    variants: product.variants?.map((v) =>
      v.variant_price == null || v.variant_price <= precio
        ? v
        : { ...v, variant_price: precio },
    ),
  };
}

/** Fecha de fin en formato largo, para los carteles. */
export function promoLineaHasta(): string {
  return new Date(PROMO_LINEA.ends_at).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}
