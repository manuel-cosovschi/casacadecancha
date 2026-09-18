import type { Product } from '@/lib/types';

/**
 * Calendario de promos sobre productos puntuales, con precio fijo.
 *
 * Distinto de `SITE_SALE`, que es un porcentaje sobre todo el catálogo: acá se
 * fija un precio para una lista de productos. Vive en el código y no en la base
 * para que viaje con el deploy y se prenda y se apague sola por fecha, sin que
 * nadie tenga que acordarse de activarla ni de darla de baja.
 *
 * Antes era UNA promo con UN precio para toda la lista. Ahora es un calendario
 * con precio por producto, por dos motivos:
 *
 *  - Un solo precio para toda la lista no sirve cuando los costos van de
 *    $20.800 a $46.639. La Argentina 2006 y la Barcelona 2009 no pueden valer
 *    lo mismo sin que una de las dos quede regalada o sin descuento real.
 *  - Con fecha de inicio además de fin, las promos de las próximas semanas se
 *    dejan escritas de una vez y cada una arranca sola el día que le toca.
 *
 * NO SE ACUMULAN. Los productos en promo quedan afuera de la base sobre la que
 * se calculan el cupón, el descuento de cliente y el de transferencia. Un
 * carrito mixto sí recibe esos descuentos, pero solo sobre lo que no está en
 * promo: la camiseta en promo ya tiene el suyo.
 */

/** Un producto dentro de una promo, con su precio propio. */
export interface ItemPromo {
  slug: string;
  /** Precio final de este producto mientras dure la promo. */
  price: number;
  /**
   * Precio de lista con el que salió. Se usa como piso del tachado, así que el
   * "antes" que ve el cliente no cambia aunque se mueva el precio de lista
   * mientras la promo está viva.
   */
  compare_price: number;
}

export interface PromoLinea {
  active: boolean;
  /** Primer instante en que corre, inclusive. ISO con offset. */
  starts_at: string;
  /** Último instante en que sigue viva, inclusive. ISO con offset. */
  ends_at: string;
  /** Nombre de la promo, para los carteles. */
  label: string;
  /** Texto corto para el badge de la tarjeta. */
  badge: string;
  /** Bajada del cartel: qué entra en esta promo. */
  subtitle: string;
  /** Los productos alcanzados. Solo estos: nada de adivinar por nombre. */
  items: ItemPromo[];
}

/**
 * Las promos, en orden. Cada una arranca y termina sola.
 *
 * Los slugs van tal cual están en la base: cinco dicen "-importada" aunque el
 * producto ahora se llame "adidas Originals", porque el slug es la URL que ya
 * circula y no se toca al renombrar.
 *
 * Los precios salen del costo real de cada camiseta (`unit_cost` +
 * `packaging_cost`), no de un porcentaje parejo. La Japón Titular 26/27 no
 * aparece en ninguna promo a propósito: cuesta $53.268 y se vende a $61.500,
 * así que cualquier descuento se come el margen entero. Ese producto no
 * necesita una promo, necesita otro precio de lista.
 */
export const CALENDARIO: PromoLinea[] = [
  {
    active: true,
    starts_at: '2026-09-13T00:00:00-03:00',
    ends_at: '2026-09-20T23:59:59-03:00',
    label: 'SEMANA DE COPA',
    badge: 'SEMANA DE COPA',
    subtitle: 'Línea adidas Icon',
    items: [
      'camiseta-ajax-icon-importada',
      'camiseta-arsenal-icon-adidas',
      'camiseta-arsenal-icon-bordo-importada',
      'camiseta-juventus-icon-adidas',
      'camiseta-liverpool-icon-adidas',
      'camiseta-liverpool-icon-negra-importada',
      'camiseta-liverpool-icon-verde-importada',
      'camiseta-newcastle-icon-importada',
    ].map((slug) => ({ slug, price: 55_000, compare_price: 60_000 })),
  },
  {
    // Los cinco productos a los que solo les queda UN talle, y de los grandes.
    // Talle L es el que se vende (5 de las 7 ventas de la tienda), así que
    // estos XL y XXL sueltos no salen solos a precio de lista: llevan dos meses
    // sin moverse. Cada uno con el descuento que su costo aguanta.
    active: true,
    starts_at: '2026-09-28T00:00:00-03:00',
    ends_at: '2026-10-04T23:59:59-03:00',
    label: 'ÚLTIMO TALLE',
    badge: 'ÚLTIMO TALLE',
    subtitle: 'Quedan XL y XXL sueltos',
    items: [
      // costo $20.800 → margen $8.200
      { slug: 'camiseta-argentina-2006-messi', price: 29_000, compare_price: 35_000 },
      // costo $38.800 → margen $8.200
      { slug: 'camiseta-juventus-icon-adidas', price: 47_000, compare_price: 57_000 },
      // costo $36.450 → margen $4.550
      { slug: 'camiseta-brasil-2002-ronaldo-importada', price: 41_000, compare_price: 47_500 },
      // costo $46.639 → margen $4.361
      { slug: 'camiseta-barcelona-2009-roma', price: 51_000, compare_price: 57_000 },
      // costo $46.639 → margen $4.361
      { slug: 'camiseta-japon-2006', price: 51_000, compare_price: 57_000 },
    ],
  },
  {
    // La línea Icon y la Barcelona Edición Especial: los que más margen tienen
    // ($24.200 y $18.204 por unidad), así que son los que pueden bajar de
    // verdad sin que duela. A $49.000 siguen dejando $16.200 y $10.204.
    active: true,
    starts_at: '2026-10-05T00:00:00-03:00',
    ends_at: '2026-10-11T23:59:59-03:00',
    label: 'SEMANA ICON',
    badge: 'SEMANA ICON',
    subtitle: 'Línea adidas Icon y Barcelona',
    items: [
      { slug: 'camiseta-liverpool-icon-verde-importada', price: 49_000, compare_price: 57_000 },
      { slug: 'camiseta-newcastle-icon-importada', price: 49_000, compare_price: 57_000 },
      { slug: 'camiseta-ajax-icon-importada', price: 49_000, compare_price: 57_000 },
      {
        slug: 'camiseta-barcelona-edicion-especial-25-26-importada',
        price: 49_000,
        compare_price: 57_000,
      },
    ],
  },
];

/** La promo que está corriendo en este momento, o null si no hay ninguna. */
export function promoLineaVigente(now: Date = new Date()): PromoLinea | null {
  const t = now.getTime();
  for (const p of CALENDARIO) {
    if (!p.active) continue;
    if (p.items.length === 0) continue;
    const desde = Date.parse(p.starts_at);
    const hasta = Date.parse(p.ends_at);
    if (Number.isNaN(desde) || Number.isNaN(hasta)) continue;
    if (t < desde || t > hasta) continue;
    return p;
  }
  return null;
}

/** ¿Hay alguna promo de línea viva en este momento? */
export function promoLineaActiva(now?: Date): boolean {
  return promoLineaVigente(now) !== null;
}

/** El ítem de la promo vigente que le corresponde a un producto, o null. */
function itemDe(slug: string, now?: Date): ItemPromo | null {
  const promo = promoLineaVigente(now);
  if (!promo) return null;
  return promo.items.find((i) => i.slug === slug && i.price > 0) ?? null;
}

/** ¿Este producto está en promo ahora? */
export function estaEnPromoLinea(slug: string, now?: Date): boolean {
  return itemDe(slug, now) !== null;
}

/** El precio de promo, o null si a ese producto no le corresponde. */
export function precioPromoLinea(
  slug: string,
  precioLista: number,
  now?: Date,
): number | null {
  const item = itemDe(slug, now);
  if (!item) return null;
  // Si el de lista ya es igual o menor, la promo no aporta nada y no se toca:
  // nunca se sube un precio por aplicar una promo.
  if (precioLista <= item.price) return null;
  return item.price;
}

/**
 * Lo que muestra el cartel de arriba.
 *
 * Cuando todos los productos de la promo valen lo mismo se anuncia ese precio.
 * Cuando cada uno tiene el suyo se anuncia el más barato con un "desde", que es
 * lo único honesto que se puede poner en un renglón.
 */
export function resumenPromo(promo: PromoLinea): {
  price: number;
  comparePrice: number;
  desde: boolean;
} {
  const precios = promo.items.map((i) => i.price);
  const min = Math.min(...precios);
  const uniforme = precios.every((p) => p === min);
  const item = promo.items.find((i) => i.price === min)!;
  return { price: min, comparePrice: item.compare_price, desde: !uniforme };
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
  const item = itemDe(product.slug, now);
  if (!item) return product;
  if (product.price <= item.price) return product;

  return {
    ...product,
    price: item.price,
    promo_label: promoLineaVigente(now)?.badge,
    // El tachado nunca baja de `compare_price`, que es el precio con el que
    // salió la promo. Sin este piso, bajarle el precio de lista a un producto
    // en promo encogía el tachado y la promo se veía peor de lo que es —
    // aunque lo que paga el cliente sea exactamente el mismo.
    compare_at_price: Math.max(
      product.price,
      product.compare_at_price ?? 0,
      item.compare_price,
    ),
    // Los talles con precio propio también quedan al precio de promo: si no,
    // un talle especial se escaparía de la promo sin que nadie lo note.
    variants: product.variants?.map((v) =>
      v.variant_price == null || v.variant_price <= item.price
        ? v
        : { ...v, variant_price: item.price },
    ),
  };
}

/**
 * Por qué un cupón no descuenta nada.
 *
 * Pasa cuando todo el carrito está en promo de línea: como la promo no se
 * acumula, la base sobre la que corre el cupón queda en cero. Decirle al
 * cliente "cupón aplicado: ahorrás $0" en verde es mentirle — se rechaza el
 * cupón y se explica el motivo, aclarando que el código no se quema.
 */
export function motivoSinBaseDescontable(now?: Date): string {
  const promo = promoLineaVigente(now);
  const que = promo
    ? `en la promo ${promo.label}, que no se combina con otros descuentos`
    : 'en promoción, y no se combina con otros descuentos';
  return `Todo lo que tenés en el carrito está ${que}. Tu código sigue intacto para una próxima compra.`;
}

/** Fecha de fin en formato largo, para los carteles. */
export function promoLineaHasta(now?: Date): string {
  const promo = promoLineaVigente(now);
  if (!promo) return '';
  return new Date(promo.ends_at).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}
