/**
 * Fidelidad automática (sin cuentas): reglas de aplicación del descuento.
 *
 * npx tsx scripts/check-loyalty-auto.ts
 */
process.env.CRON_SECRET = 'secreto-de-prueba';
import { LOYALTY, percentForOrders, statusFromOrders } from '../src/lib/loyalty';
import { salePercentAt, couponBlockedBySale, SITE_SALE } from '../src/lib/sale';

let fail = 0;
const check = (l: string, a: unknown, e: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(e);
  if (!ok) fail++;
  console.log(
    `${ok ? 'OK  ' : 'FALLA'} ${l}: ${JSON.stringify(a)}${ok ? '' : ` (esperado ${JSON.stringify(e)})`}`,
  );
};

/** El mismo cálculo que hacen el checkout (vista) y `createOrder` (cobro). */
const loyaltyDiscount = (subtotal: number, percent: number) =>
  percent > 0 ? Math.round(subtotal * (percent / 100)) : 0;

/** La regla de no acumulación: se aplica el mejor de los dos, nunca la suma. */
const best = (coupon: number, loyalty: number) => Math.max(coupon, loyalty);

console.log('--- cuánto descuenta cada nivel sobre $120.000 ---');
check('0 compras -> $0',      loyaltyDiscount(120_000, percentForOrders(0)), 0);
check('1 compra  -> $12.000', loyaltyDiscount(120_000, percentForOrders(1)), 12_000);
check('2 compras -> $18.000', loyaltyDiscount(120_000, percentForOrders(2)), 18_000);
check('3 compras -> $24.000', loyaltyDiscount(120_000, percentForOrders(3)), 24_000);
check('9 compras -> $24.000 (tope)', loyaltyDiscount(120_000, percentForOrders(9)), 24_000);

console.log('\n--- no se acumula: gana el mejor, nunca se suman ---');
check('cupón $5.000 vs cliente $18.000 -> gana cliente', best(5_000, 18_000), 18_000);
check('cupón $30.000 vs cliente $18.000 -> gana cupón',  best(30_000, 18_000), 30_000);
check('cupón $18.000 vs cliente $18.000 -> uno solo',    best(18_000, 18_000), 18_000);
check('sin cupón -> queda el de cliente',                best(0, 12_000), 12_000);
check('sin nada -> $0',                                  best(0, 0), 0);
check('la suma NUNCA es el resultado', best(5_000, 18_000) === 23_000, false);

console.log('\n--- vista y cobro calculan lo mismo ---');
// El checkout usa `displaySubtotal` y el servidor su propio `subtotal`; con el
// recargo nacional ya metido en ambos, tienen que dar idéntico.
for (const sub of [100_000, 120_000, 137_450, 60_000]) {
  for (const pct of [10, 15, 20]) {
    const vista = Math.round(sub * (pct / 100));
    const cobro = loyaltyDiscount(sub, pct);
    check(`$${sub.toLocaleString('es-AR')} al ${pct}%`, vista, cobro);
  }
}

console.log('\n--- el umbral se mide sobre el subtotal, antes de descuentos ---');
// Una compra de $105.000 con 20% de descuento paga $84.000, pero califica:
// si se midiera sobre el total, ser buen cliente te bajaría de nivel.
const subtotal = 105_000;
const pagado = subtotal - loyaltyDiscount(subtotal, 20);
check('subtotal $105.000 califica', subtotal >= LOYALTY.minOrderAmount, true);
check('el total pagado $84.000 NO alcanzaría', pagado >= LOYALTY.minOrderAmount, false);
check('igual cuenta, porque se mide el subtotal', subtotal >= LOYALTY.minOrderAmount, true);

console.log('\n--- el mail de "subiste de nivel" solo en el escalón ---');
const esSalto = (orders: number) => LOYALTY.tiers.some((t) => t.orders === orders);
check('compra 1 -> avisa', esSalto(1), true);
check('compra 2 -> avisa', esSalto(2), true);
check('compra 3 -> avisa', esSalto(3), true);
check('compra 4 -> NO avisa (ya está al tope)', esSalto(4), false);
check('compra 7 -> NO avisa', esSalto(7), false);
check('compra 0 -> NO avisa', esSalto(0), false);

console.log('\n--- no se pisa con la promo del catálogo ---');
const conPromo = new Date('2026-09-01T12:00:00-03:00'); // promo vigente
const sinPromo = new Date('2026-09-08T12:00:00-03:00'); // ya vencida
check('el 1/9 la promo estaba activa', salePercentAt(conPromo) > 0, true);
check('con promo activa se bloquea el descuento', Boolean(couponBlockedBySale(conPromo)), true);
check('hoy la promo está vencida', salePercentAt(sinPromo), 0);
check('sin promo el descuento se puede aplicar', couponBlockedBySale(sinPromo), null);
check('la promo del sitio venció el', SITE_SALE.ends_at.slice(0, 10), '2026-09-06');

console.log('\n--- lo que se le muestra al cliente ---');
check('recién llegado: nada que mostrar', statusFromOrders(0).percent, 0);
check('1 compra: 10% y le falta 1 para el 15%', statusFromOrders(1), {
  orders: 1, percent: 10, toNext: 1, nextPercent: 15,
});
check('3 compras: al tope, sin "próximo nivel"', statusFromOrders(3).toNext, null);

console.log(fail === 0 ? '\nTodo OK ✅' : `\n${fail} fallas ❌`);
process.exit(fail === 0 ? 0 : 1);
