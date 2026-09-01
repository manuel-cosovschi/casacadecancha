/**
 * Chequeo rápido de la cuenta de la promo. Corre con:
 *   npx tsx scripts/check-sale-math.ts
 *
 * No es un test formal: verifica que el precio que ve el cliente y el que
 * calcula el servidor den exactamente lo mismo en los casos que importan.
 */
import { applyDiscount, mpSurcharge, preorderDeposit } from '../src/lib/utils';
import { withNationalMarkup } from '../src/lib/shipping';
import { salePercentAt, withSalePricing, couponBlockedBySale, SITE_SALE } from '../src/lib/sale';
import type { Product } from '../src/lib/types';

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (esperado ${JSON.stringify(expected)})`}`);
}

const during = new Date('2026-09-03T12:00:00-03:00');
const lastMinute = new Date('2026-09-06T23:59:00-03:00');
const after = new Date('2026-09-07T00:30:00-03:00');

console.log('--- vigencia ---');
check('durante la promo', salePercentAt(during), 15);
check('domingo 23:59', salePercentAt(lastMinute), 15);
check('lunes 00:30 (vencida)', salePercentAt(after), 0);
check('apagada a mano', salePercentAt(during, { ...SITE_SALE, active: false }), 0);
check('porcentaje inválido', salePercentAt(during, { ...SITE_SALE, percent: -5 }), 0);
check('fecha inválida', salePercentAt(during, { ...SITE_SALE, ends_at: 'nada' }), 0);

console.log('\n--- precios de catálogo (Chelsea $55.000 / Barcelona $60.000) ---');
const chelsea = { price: 55000, compare_at_price: null, variants: [] } as unknown as Product;
const conPromo = withSalePricing(chelsea, during);
check('Chelsea con promo', conPromo.price, 46750);
check('Chelsea precio tachado', conPromo.compare_at_price, 55000);
check('Barcelona con promo', withSalePricing({ price: 60000, compare_at_price: null } as unknown as Product, during).price, 51000);
check('vencida: no toca el precio', withSalePricing(chelsea, after).price, 55000);

console.log('\n--- respeta un precio tachado previo más alto ---');
const enOferta = { price: 50000, compare_at_price: 70000 } as unknown as Product;
check('mantiene el compare_at más alto', withSalePricing(enOferta, during).compare_at_price, 70000);
check('descuenta sobre el precio vigente', withSalePricing(enOferta, during).price, 42500);

console.log('\n--- cliente vs servidor (mismo resultado) ---');
const pct = salePercentAt(during);
// Servidor (createOrder): promo primero, después recargo nacional.
const servidorRetiro = applyDiscount(55000, pct);
const servidorNacional = withNationalMarkup(applyDiscount(55000, pct));
// Cliente (CheckoutForm): usa el precio ya descontado que vino del catálogo.
const precioEnCarrito = withSalePricing(chelsea, during).price;
const clienteRetiro = precioEnCarrito;
const clienteNacional = withNationalMarkup(precioEnCarrito);
check('retiro: cliente = servidor', clienteRetiro, servidorRetiro);
check('nacional: cliente = servidor', clienteNacional, servidorNacional);

console.log('\n--- composición con los otros descuentos ---');
const sub = applyDiscount(55000, pct) * 2; // 2 unidades
check('subtotal 2u con promo', sub, 93500);
// Transferencia hoy está en 0; si se activara al 10% debe componer, no romper.
check('promo + 10% transferencia', applyDiscount(sub, 10), 84150);
check('sin transferencia (0%)', applyDiscount(sub, 0), sub);
check('seña de preventa sobre precio con promo', preorderDeposit(applyDiscount(55000, pct)), preorderDeposit(46750));
check('recargo MP sobre total con promo', mpSurcharge(sub) > 0, true);

console.log('\n--- cupones: no se acumulan con la promo ---');
check('con promo viva, el cupón se bloquea', couponBlockedBySale(during) !== null, true);
check('el mensaje dice el porcentaje', (couponBlockedBySale(during) || '').includes('15%'), true);
check('vencida la promo, el cupón corre normal', couponBlockedBySale(after), null);
// Un cupón del 5% durante la promo NO debe dar 19,25%: el cliente paga el precio con 15%.
const conCupon = applyDiscount(55000, salePercentAt(during));
check('Chelsea con promo y cupón 5% = solo la promo', conCupon, 46750);
check('no llega al 19,25% (44.412)', conCupon !== 44412, true);

console.log(failures === 0 ? '\nTodo OK' : `\n${failures} chequeo(s) fallaron`);
process.exit(failures === 0 ? 0 : 1);
