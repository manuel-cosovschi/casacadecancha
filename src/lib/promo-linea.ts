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
  /**
   * Si es true, a los productos de esta promo no se les apila NADA encima.
   *
   * Es para la liquidación: ahí los precios están al hueso, con el margen mínimo
   * que cada producto aguanta —hay uno con 10%—. Un 15% encima de eso se vende
   * abajo del costo, y no hay volumen que lo compense cuando queda una unidad de
   * cada cosa.
   *
   * Cierra las dos únicas cosas que sí se acumulaban sobre una promo de línea:
   *  - el cupón de bienvenida, que corría sobre el carrito entero;
   *  - el porcentaje de `SITE_SALE`, que se aplica DESPUÉS del precio fijo.
   *
   * Ojo con el alcance: no apaga los cupones ni las promos de toda la tienda. Lo
   * que queda afuera de esta promo —una Mystery Box, una preventa, los dos
   * productos que no entraron— sigue recibiendo todo como siempre. Si el carrito
   * es todo promo, el cupón se rechaza con el motivo y el código no se quema
   * (ver `motivoSinBaseDescontable`).
   */
  sinDescuentosEncima?: boolean;
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
    //
    // Cortada un día antes de lo previsto (iba hasta el domingo 4) porque la
    // liquidación arranca el 29 y `promoLineaVigente` devuelve la PRIMERA que
    // matchea: si esta seguía viva, tapaba la liquidación toda la semana. No
    // perjudica a nadie —los cinco productos quedan iguales o más baratos en la
    // liquidación—, y se dejan los precios escritos como quedó el registro de lo
    // que se publicó.
    active: true,
    starts_at: '2026-09-28T00:00:00-03:00',
    ends_at: '2026-09-28T23:59:59-03:00',
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
    /**
     * LIQUIDACIÓN FINAL. Reemplaza al calendario semanal: se vende lo que hay
     * hasta que no quede nada, y cuando una se agota desaparece sola de la web.
     *
     * CÓMO SALIÓ CADA PRECIO. No es un porcentaje parejo: es el piso de cada
     * producto. A cada uno se le dejó, como mínimo, $7.000 de margen Y un 16%
     * del precio de venta —lo que resulte más alto—, y de ahí se redondeó para
     * abajo a una terminación en 900. Por eso la línea Icon baja 30% (cuesta
     * $32.000 y se vendía a $57.000) y la Argentina Titular importada baja 11%
     * (cuesta $30.821): el que tiene más aire baja más.
     *
     * TRES PRECIOS ESTÁN POR DEBAJO DE ESE PISO, a propósito: Brasil 2002,
     * Barcelona 2009 y Japón 2006 ya estaban prometidas más baratas en la promo
     * ÚLTIMO TALLE de esta semana. Subirles el precio para "liquidarlas" sería
     * una burla, así que se respeta el precio que ya se publicó.
     *
     * DOS PRODUCTOS NO ENTRAN. La Racing 2000/01 (cuesta $48.500 y se vende a
     * $58.500) y la Japón Titular 26/27 (cuesta $52.468 y se vende a $61.500)
     * ya se venden con 17% y 15% de margen: están por debajo del piso ANTES de
     * tocarlas. No tienen un problema de promoción, tienen un problema de
     * precio de compra, y meterlas acá con un 4% de descuento simulado solo
     * ensucia la liquidación.
     *
     * La fecha de fin es lejana porque termina cuando se acaba el stock, no un
     * domingo. Si sobra algo, se corta cambiando `active` a false.
     */
    active: true,
    starts_at: '2026-09-29T00:00:00-03:00',
    ends_at: '2026-12-31T23:59:59-03:00',
    label: 'LIQUIDACIÓN FINAL',
    badge: 'LIQUIDACIÓN',
    subtitle: 'Todo lo que queda, al precio más bajo',
    // Los precios están al hueso: no se les apila nada, ni el de bienvenida ni
    // el porcentaje del catálogo.
    sinDescuentosEncima: true,
    items: [
      // costo $32.000 → margen $7.900 (20%)
      { slug: 'camiseta-ajax-icon-importada', price: 39_900, compare_price: 57_000 },
      { slug: 'camiseta-liverpool-icon-negra-importada', price: 39_900, compare_price: 57_000 },
      { slug: 'camiseta-liverpool-icon-verde-importada', price: 39_900, compare_price: 57_000 },
      { slug: 'camiseta-newcastle-icon-importada', price: 39_900, compare_price: 57_000 },
      // La Pelota Mundial 2026 (costo $19.600, 3 unidades) NO entra, aunque
      // tendría lugar de sobra para bajar a $26.900: está INACTIVA en el
      // catálogo, así que no se ve en la web. Si estuviera en la lista, sería el
      // ítem más barato y la franja de arriba anunciaría "desde $26.900" por algo
      // que nadie puede comprar. Si se activa, se agrega acá con ese precio.
      // costo $20.000 → margen $7.900 (28%)
      { slug: 'camiseta-argentina-2006-messi', price: 27_900, compare_price: 35_000 },
      // costo $37.996 y $38.000 → margen $7.904 y $7.900 (17%)
      {
        slug: 'camiseta-barcelona-edicion-especial-25-26-importada',
        price: 45_900,
        compare_price: 57_000,
      },
      { slug: 'camiseta-juventus-icon-adidas', price: 45_900, compare_price: 57_000 },
      // costo $35.650 → margen $5.350 (13%). Precio heredado de ÚLTIMO TALLE.
      { slug: 'camiseta-brasil-2002-ronaldo-importada', price: 41_000, compare_price: 47_500 },
      // costo $30.821 → margen $7.079 (19%). Cinco unidades, el que más stock tiene.
      { slug: 'camiseta-argentina-titular-2026-g5', price: 37_900, compare_price: 42_500 },
      // costo $45.839 → margen $5.161 (10%). Precio heredado de ÚLTIMO TALLE.
      { slug: 'camiseta-barcelona-2009-roma', price: 51_000, compare_price: 57_000 },
      { slug: 'camiseta-japon-2006', price: 51_000, compare_price: 57_000 },
    ],
  },
];

/**
 * ¿La promo vigente es de las que no admiten nada encima?
 *
 * Hoy se usa para dos cosas. Una: el cupón de bienvenida, que normalmente corre
 * sobre el carrito entero —promos incluidas— pierde ese privilegio y juega como
 * todos los demás, o sea solo sobre lo que NO está en la promo. Si no queda nada
 * afuera, el cupón se rechaza con `motivoSinBaseDescontable` y el código sigue
 * sirviendo para después. La otra: el porcentaje del catálogo, vía
 * `admiteSaleDelCatalogo`.
 */
export function promoSinNadaEncima(now?: Date): boolean {
  return promoLineaVigente(now)?.sinDescuentosEncima === true;
}

/**
 * ¿A este producto se le puede apilar el porcentaje del catálogo (`SITE_SALE`)?
 *
 * No cuando está en una promo al piso: ese precio fijo ya tiene el margen mínimo
 * que el producto aguanta, y el porcentaje se aplica DESPUÉS, así que lo
 * hundiría abajo del costo. Con la liquidación viva, un 15% en todo dejaría la
 * Barcelona 2009 en $43.350 cuando cuesta $45.839: dos mil pesos de pérdida por
 * camiseta.
 *
 * Lo que no está en la promo sí recibe el porcentaje normal, así que se puede
 * lanzar un 15% en todo sin miedo a lo que está liquidado.
 */
export function admiteSaleDelCatalogo(slug: string, now?: Date): boolean {
  return !(estaEnPromoLinea(slug, now) && promoSinNadaEncima(now));
}

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
