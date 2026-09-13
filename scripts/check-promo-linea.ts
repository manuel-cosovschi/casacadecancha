/**
 * Promo de línea "Semana de Copa": precios y regla de no acumulación.
 *
 * npx tsx scripts/check-promo-linea.ts
 */
import {
  PROMO_LINEA,
  promoLineaActiva,
  estaEnPromoLinea,
  precioPromoLinea,
  withPromoLinea,
} from '../src/lib/promo-linea';
import { LOYALTY, percentForOrders } from '../src/lib/loyalty';
import type { Product } from '../src/lib/types';

let fail = 0;
const check = (l: string, a: unknown, e: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(e);
  if (!ok) fail++;
  console.log(
    `${ok ? 'OK  ' : 'FALLA'} ${l}: ${JSON.stringify(a)}${ok ? '' : ` (esperado ${JSON.stringify(e)})`}`,
  );
};

const DURANTE = new Date('2026-09-15T12:00:00-03:00');
const DESPUES = new Date('2026-09-21T00:00:01-03:00');
const ULTIMO_MINUTO = new Date('2026-09-20T23:59:00-03:00');

console.log('--- vigencia ---');
check('el 15/9 está activa', promoLineaActiva(DURANTE), true);
check('el 20/9 a las 23:59 todavía está activa', promoLineaActiva(ULTIMO_MINUTO), true);
check('el 21/9 ya venció', promoLineaActiva(DESPUES), false);
check('termina el domingo 20/9', PROMO_LINEA.ends_at.slice(0, 10), '2026-09-20');
check('son 8 productos', PROMO_LINEA.slugs.length, 8);
check('sin repetidos', new Set(PROMO_LINEA.slugs).size, 8);

console.log('\n--- qué productos entran ---');
const ENTRAN = [
  'camiseta-ajax-icon-importada',
  'camiseta-arsenal-icon-adidas',
  'camiseta-arsenal-icon-bordo-importada',
  'camiseta-juventus-icon-adidas',
  'camiseta-liverpool-icon-adidas',
  'camiseta-liverpool-icon-negra-importada',
  'camiseta-liverpool-icon-verde-importada',
  'camiseta-newcastle-icon-importada',
];
for (const slug of ENTRAN) check(`entra ${slug}`, estaEnPromoLinea(slug, DURANTE), true);

const NO_ENTRAN = [
  'camiseta-chelsea-25-26-importada',
  'camiseta-japon-titular-26-27-importada',
  'camiseta-argentina-titular-2026',
  'camiseta-brasil-2002-ronaldo-importada',
];
for (const slug of NO_ENTRAN) check(`NO entra ${slug}`, estaEnPromoLinea(slug, DURANTE), false);

console.log('\n--- precio ---');
check('de $60.000 pasa a $55.000', precioPromoLinea(ENTRAN[0], 60_000, DURANTE), 55_000);
check('vencida, no toca el precio', precioPromoLinea(ENTRAN[0], 60_000, DESPUES), null);
check('un producto fuera de la lista no se toca', precioPromoLinea(NO_ENTRAN[0], 55_000, DURANTE), null);
// Nunca se sube un precio por aplicar una promo.
check('si ya cuesta menos, no se toca', precioPromoLinea(ENTRAN[0], 50_000, DURANTE), null);
check('si cuesta justo lo mismo, no se toca', precioPromoLinea(ENTRAN[0], 55_000, DURANTE), null);

console.log('\n--- lo que ve el cliente ---');
const base = {
  slug: ENTRAN[0],
  price: 60_000,
  compare_at_price: null,
  variants: [
    { variant_price: null },
    { variant_price: 62_000 },
    { variant_price: 40_000 },
  ],
} as unknown as Product;
const conPromo = withPromoLinea(base, DURANTE);
check('el precio queda en $55.000', conPromo.price, 55_000);
check('el de lista queda tachado en $60.000', conPromo.compare_at_price, 60_000);
check('lleva el cartel de la promo', conPromo.promo_label, 'SEMANA DE COPA');
check('un talle más caro también baja', conPromo.variants?.[1]?.variant_price, 55_000);
check('un talle más barato NO sube', conPromo.variants?.[2]?.variant_price, 40_000);
check('un talle sin precio propio queda igual', conPromo.variants?.[0]?.variant_price, null);
check('vencida, el producto sale intacto', withPromoLinea(base, DESPUES).price, 60_000);
check('vencida, sin cartel', withPromoLinea(base, DESPUES).promo_label, undefined);

console.log('\n--- NO SE ACUMULA ---');
// La base sobre la que corren cupón y descuento de cliente deja afuera lo que
// está en promo. Es la misma cuenta que hacen el checkout y `createOrder`.
const baseDescontable = (carrito: { slug: string; precio: number; cant: number }[]) =>
  carrito.reduce(
    (a, i) => a + (estaEnPromoLinea(i.slug, DURANTE) ? 0 : i.precio * i.cant),
    0,
  );
const subtotalTotal = (carrito: { precio: number; cant: number }[]) =>
  carrito.reduce((a, i) => a + i.precio * i.cant, 0);

const soloPromo = [{ slug: ENTRAN[0], precio: 55_000, cant: 2 }];
check('carrito solo con promo: subtotal $110.000', subtotalTotal(soloPromo), 110_000);
check('carrito solo con promo: nada descontable', baseDescontable(soloPromo), 0);
const pct15 = percentForOrders(3);
check('un cliente nivel 3 no descuenta nada encima', Math.round(baseDescontable(soloPromo) * (pct15 / 100)), 0);

const mixto = [
  { slug: ENTRAN[0], precio: 55_000, cant: 1 }, // en promo
  { slug: NO_ENTRAN[0], precio: 55_000, cant: 1 }, // Chelsea, fuera de la promo
];
check('carrito mixto: subtotal $110.000', subtotalTotal(mixto), 110_000);
check('carrito mixto: descontable solo $55.000', baseDescontable(mixto), 55_000);
check(
  'cliente nivel 3 descuenta $8.250, no $16.500',
  Math.round(baseDescontable(mixto) * (pct15 / 100)),
  8_250,
);

const sinPromo = [{ slug: NO_ENTRAN[0], precio: 55_000, cant: 2 }];
check('sin nada en promo, la base es todo el subtotal', baseDescontable(sinPromo), subtotalTotal(sinPromo));

console.log('\n--- márgenes: nada se vende por debajo del costo ---');
// Costos reales: las "adidas Originals" $38.000, las "Importada" $32.000.
for (const [nombre, costo] of [['adidas Originals', 38_000], ['Importada', 32_000]] as const) {
  const gana = PROMO_LINEA.price - costo;
  check(`${nombre} a $55.000 deja $${gana.toLocaleString('es-AR')}`, gana > 0, true);
}
// Qué pasaría si se acumulara con el tope de fidelidad. Ojo: NO daría pérdida
// —queda margen, aunque fino—, así que no acumular es una decisión del dueño y
// no una necesidad de números. Queda anotado para no confundir las dos cosas.
const topeFid = Math.max(...LOYALTY.tiers.map((t) => t.percent));
const siSeAcumulara = PROMO_LINEA.price - Math.round(PROMO_LINEA.price * (topeFid / 100));
check(
  `acumulando el ${topeFid}% quedaría en $${siSeAcumulara.toLocaleString('es-AR')}: sigue arriba del costo de $38.000`,
  siSeAcumulara > 38_000,
  true,
);
check(
  `pero dejaría solo $${(siSeAcumulara - 38_000).toLocaleString('es-AR')} de ganancia`,
  siSeAcumulara - 38_000 < 10_000,
  true,
);
check('igual no se acumula, por decisión: la base descontable es 0', baseDescontable(soloPromo), 0);

console.log('\n--- la promo cuenta para fidelidad igual ---');
// El umbral se mide sobre el subtotal, y ese incluye lo que está en promo:
// comprar en promo también suma para el descuento de cliente.
check(
  'una compra de 2 en promo ($110.000) supera el umbral',
  subtotalTotal(soloPromo) >= LOYALTY.minOrderAmount,
  true,
);

console.log(fail === 0 ? '\nTodo OK ✅' : `\n${fail} fallas ❌`);
process.exit(fail === 0 ? 0 : 1);
