/**
 * Calendario de promos de línea: vigencia, precios, márgenes y no acumulación.
 *
 * npx tsx scripts/check-promo-linea.ts
 */
import {
  CALENDARIO,
  promoLineaVigente,
  promoLineaActiva,
  estaEnPromoLinea,
  precioPromoLinea,
  withPromoLinea,
  resumenPromo,
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

/**
 * Los slugs que existen de verdad en el catálogo.
 *
 * Está acá escrito a mano porque el script no habla con la base. Vale la pena
 * igual: al escribir el calendario puse CUATRO slugs mal —inventé
 * `camiseta-japon-2006-importada` cuando es `camiseta-japon-2006`— y un slug
 * que no existe no rompe nada, simplemente hace que la promo no le aplique a
 * nadie. Se descubriría el lunes, con la promo ya publicada.
 *
 * Si se da de alta un producto nuevo y se lo quiere en una promo, agregalo acá.
 */
const CATALOGO = new Set([
  'camiseta-ajax-icon-importada',
  'camiseta-argentina-2006-messi',
  'camiseta-argentina-retro-1986',
  'camiseta-argentina-suplente-2026',
  'camiseta-argentina-suplente-2026-g5',
  'camiseta-argentina-titular-2026',
  'camiseta-argentina-titular-2026-g5',
  'camiseta-arsenal-icon-adidas',
  'camiseta-arsenal-icon-bordo-importada',
  'camiseta-barcelona-2009-roma',
  'camiseta-barcelona-edicion-especial-25-26-importada',
  'camiseta-boca-titular-25-26-paredes-importada',
  'camiseta-brasil-2002-ronaldo-importada',
  'camiseta-chelsea-importada',
  'camiseta-japon-2006',
  'camiseta-japon-titular-26-27-importada',
  'camiseta-juventus-icon-adidas',
  'camiseta-liverpool-icon-adidas',
  'camiseta-liverpool-icon-negra-importada',
  'camiseta-liverpool-icon-verde-importada',
  'camiseta-milan-2009-ronaldinho-importada',
  'camiseta-newcastle-icon-importada',
  'camiseta-noruega-suplente-importada',
  'camiseta-racing-2000-01-titular-milito-importada',
  'musculosa-argentina-importada',
  'mistery-box-champ',
  'mistery-box-goat',
  'mistery-box-leyend',
]);

/**
 * Costo real de cada producto: `unit_cost` + `packaging_cost`.
 *
 * Ojo con el packaging: solo 4 de los 28 productos lo tienen cargado (las
 * cuatro Argentina, a $800). En el resto está en cero, así que el costo es el
 * `unit_cost` pelado. Antes acá estaban todos con $800 sumados de más, lo que
 * hacía parecer los márgenes más flacos de lo que son.
 */
const COSTO: Record<string, number> = {
  'camiseta-ajax-icon-importada': 32_000,
  'camiseta-argentina-2006-messi': 20_000,
  'camiseta-arsenal-icon-adidas': 38_000,
  'camiseta-arsenal-icon-bordo-importada': 32_000,
  'camiseta-barcelona-2009-roma': 45_839,
  'camiseta-barcelona-edicion-especial-25-26-importada': 37_996,
  'camiseta-brasil-2002-ronaldo-importada': 35_650,
  'camiseta-japon-2006': 45_839,
  'camiseta-japon-titular-26-27-importada': 52_468,
  'camiseta-juventus-icon-adidas': 38_000,
  'camiseta-liverpool-icon-adidas': 38_000,
  'camiseta-liverpool-icon-negra-importada': 32_000,
  'camiseta-liverpool-icon-verde-importada': 32_000,
  'camiseta-newcastle-icon-importada': 32_000,
  'camiseta-racing-2000-01-titular-milito-importada': 48_500,
};

console.log('--- el calendario está bien escrito ---');
for (const p of CALENDARIO) {
  const desde = Date.parse(p.starts_at);
  const hasta = Date.parse(p.ends_at);
  check(`${p.label}: las fechas se entienden`, !Number.isNaN(desde) && !Number.isNaN(hasta), true);
  check(`${p.label}: empieza antes de terminar`, desde < hasta, true);
  check(`${p.label}: tiene productos`, p.items.length > 0, true);
  check(
    `${p.label}: sin repetidos`,
    new Set(p.items.map((i) => i.slug)).size,
    p.items.length,
  );
  for (const i of p.items) {
    // Un slug que no existe no rompe nada: hace que la promo no le aplique a
    // nadie, en silencio, hasta que alguien mire las ventas.
    check(`${p.label}: ${i.slug} existe en el catálogo`, CATALOGO.has(i.slug), true);
    check(`${p.label}: ${i.slug} baja de precio`, i.price < i.compare_price, true);
  }
}

console.log('\n--- dos promos nunca corren a la vez ---');
// Si se pisan, `promoLineaVigente` devuelve la primera y la otra desaparece sin
// aviso. Es el tipo de error que se ve recién cuando pasó la semana.
for (let a = 0; a < CALENDARIO.length; a++) {
  for (let b = a + 1; b < CALENDARIO.length; b++) {
    const A = CALENDARIO[a];
    const B = CALENDARIO[b];
    const pisa =
      Date.parse(A.starts_at) <= Date.parse(B.ends_at) &&
      Date.parse(B.starts_at) <= Date.parse(A.ends_at);
    check(`${A.label} y ${B.label} no se pisan`, pisa, false);
  }
}

console.log('\n--- nada se vende por debajo del costo ---');
for (const p of CALENDARIO) {
  for (const i of p.items) {
    const costo = COSTO[i.slug];
    if (costo === undefined) {
      console.log(`      (sin costo cargado para ${i.slug}, no se puede verificar)`);
      continue;
    }
    const gana = i.price - costo;
    check(
      `${p.label}: ${i.slug} a $${i.price.toLocaleString('es-AR')} deja $${gana.toLocaleString('es-AR')}`,
      gana > 0,
      true,
    );
  }
}

console.log('\n--- cada promo se prende y se apaga sola ---');
const [COPA, TALLE, ICON] = CALENDARIO;
const EN = (iso: string) => new Date(iso);

check('el 15/9 corre SEMANA DE COPA', promoLineaVigente(EN('2026-09-15T12:00:00-03:00'))?.label, COPA.label);
check('el 20/9 23:59 todavía corre', promoLineaVigente(EN('2026-09-20T23:59:00-03:00'))?.label, COPA.label);
check('el 21/9 no corre ninguna', promoLineaVigente(EN('2026-09-21T00:00:01-03:00')), null);
check('el 24/9 (semana del cupón) no corre ninguna', promoLineaActiva(EN('2026-09-24T12:00:00-03:00')), false);
check('el 28/9 arranca ÚLTIMO TALLE', promoLineaVigente(EN('2026-09-28T00:00:01-03:00'))?.label, TALLE.label);
check('el 4/10 23:59 todavía corre', promoLineaVigente(EN('2026-10-04T23:59:00-03:00'))?.label, TALLE.label);
check('el 5/10 arranca SEMANA ICON', promoLineaVigente(EN('2026-10-05T00:00:01-03:00'))?.label, ICON.label);
check('el 11/10 23:59 todavía corre', promoLineaVigente(EN('2026-10-11T23:59:00-03:00'))?.label, ICON.label);
check('el 12/10 no corre ninguna', promoLineaVigente(EN('2026-10-12T00:00:01-03:00')), null);

console.log('\n--- la Japón Titular 26/27 nunca entra en promo ---');
// Cuesta $52.468 y se vende a $61.500: cualquier descuento se come el margen.
for (const p of CALENDARIO) {
  check(
    `${p.label} no la incluye`,
    p.items.some((i) => i.slug === 'camiseta-japon-titular-26-27-importada'),
    false,
  );
}

console.log('\n--- precio por producto ---');
const DUR_TALLE = EN('2026-10-01T12:00:00-03:00');
check('la Messi 2006 baja a $29.000', precioPromoLinea('camiseta-argentina-2006-messi', 35_000, DUR_TALLE), 29_000);
check('la Japón 2006 baja a $51.000', precioPromoLinea('camiseta-japon-2006', 57_000, DUR_TALLE), 51_000);
check('la Juventus baja a $47.000', precioPromoLinea('camiseta-juventus-icon-adidas', 57_000, DUR_TALLE), 47_000);
check('un producto fuera de la promo no se toca', precioPromoLinea('camiseta-chelsea-importada', 52_000, DUR_TALLE), null);
// Nunca se sube un precio por aplicar una promo.
check('si ya cuesta menos, no se toca', precioPromoLinea('camiseta-japon-2006', 45_000, DUR_TALLE), null);
check('si cuesta justo lo mismo, no se toca', precioPromoLinea('camiseta-japon-2006', 51_000, DUR_TALLE), null);
check('fuera de fecha, no toca el precio', precioPromoLinea('camiseta-japon-2006', 57_000, EN('2026-10-20T12:00:00-03:00')), null);

console.log('\n--- el cartel de arriba ---');
const rIcon = resumenPromo(ICON);
check('SEMANA ICON: todos valen igual, anuncia $49.000', [rIcon.price, rIcon.desde], [49_000, false]);
const rTalle = resumenPromo(TALLE);
check('ÚLTIMO TALLE: precios distintos, anuncia "desde $29.000"', [rTalle.price, rTalle.desde], [29_000, true]);
check('ÚLTIMO TALLE: tacha el precio del más barato', rTalle.comparePrice, 35_000);

console.log('\n--- lo que ve el cliente ---');
const base = {
  slug: 'camiseta-japon-2006',
  price: 57_000,
  compare_at_price: null,
  variants: [{ variant_price: null }, { variant_price: 62_000 }, { variant_price: 40_000 }],
} as unknown as Product;
const conPromo = withPromoLinea(base, DUR_TALLE);
check('el precio queda en $51.000', conPromo.price, 51_000);
check('el de lista queda tachado en $57.000', conPromo.compare_at_price, 57_000);
check('lleva el cartel de la promo', conPromo.promo_label, 'ÚLTIMO TALLE');
check('un talle más caro también baja', conPromo.variants?.[1]?.variant_price, 51_000);
check('un talle más barato NO sube', conPromo.variants?.[2]?.variant_price, 40_000);
check('un talle sin precio propio queda igual', conPromo.variants?.[0]?.variant_price, null);
const fuera = withPromoLinea(base, EN('2026-10-20T12:00:00-03:00'));
check('fuera de fecha, el producto sale intacto', fuera.price, 57_000);
check('fuera de fecha, sin cartel', fuera.promo_label, undefined);

console.log('\n--- NO SE ACUMULA ---');
// La base sobre la que corren cupón y descuento de cliente deja afuera lo que
// está en promo. Es la misma cuenta que hacen el checkout y `createOrder`.
const baseDescontable = (carrito: { slug: string; precio: number; cant: number }[], now: Date) =>
  carrito.reduce((a, i) => a + (estaEnPromoLinea(i.slug, now) ? 0 : i.precio * i.cant), 0);
const subtotalTotal = (carrito: { precio: number; cant: number }[]) =>
  carrito.reduce((a, i) => a + i.precio * i.cant, 0);

const soloPromo = [{ slug: 'camiseta-japon-2006', precio: 51_000, cant: 2 }];
check('carrito solo con promo: subtotal $102.000', subtotalTotal(soloPromo), 102_000);
check('carrito solo con promo: nada descontable', baseDescontable(soloPromo, DUR_TALLE), 0);
const pct15 = percentForOrders(3);
check('un cliente nivel 3 no descuenta nada encima', Math.round(baseDescontable(soloPromo, DUR_TALLE) * (pct15 / 100)), 0);

const mixto = [
  { slug: 'camiseta-japon-2006', precio: 51_000, cant: 1 }, // en promo
  { slug: 'camiseta-chelsea-importada', precio: 52_000, cant: 1 }, // fuera
];
check('carrito mixto: descontable solo $52.000', baseDescontable(mixto, DUR_TALLE), 52_000);
check(
  'cliente nivel 3 descuenta $7.800, no $15.450',
  Math.round(baseDescontable(mixto, DUR_TALLE) * (pct15 / 100)),
  7_800,
);

const sinPromo = [{ slug: 'camiseta-chelsea-importada', precio: 52_000, cant: 2 }];
check('sin nada en promo, la base es todo el subtotal', baseDescontable(sinPromo, DUR_TALLE), subtotalTotal(sinPromo));

console.log('\n--- comprar en promo suma para fidelidad igual ---');
// El umbral se mide sobre el subtotal, y ese incluye lo que está en promo.
check(
  'una compra de 2 en promo ($102.000) supera el umbral',
  subtotalTotal(soloPromo) >= LOYALTY.minOrderAmount,
  true,
);

console.log(fail === 0 ? '\nTodo OK ✅' : `\n${fail} fallas ❌`);
process.exit(fail === 0 ? 0 : 1);
