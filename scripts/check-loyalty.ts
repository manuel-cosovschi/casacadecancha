/** npx tsx scripts/check-loyalty.ts */
process.env.CRON_SECRET = 'secreto-de-prueba';
import { percentForOrders, statusFromOrders, loyaltyCode, verifyLoyaltyCode, isLoyaltyCode, LOYALTY } from '../src/lib/loyalty';

let fail = 0;
const check = (l: string, a: unknown, e: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(e);
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${l}: ${JSON.stringify(a)}${ok ? '' : ` (esperado ${JSON.stringify(e)})`}`);
};

console.log('--- escalones ---');
check('0 compras -> sin descuento', percentForOrders(0), 0);
check('1 compra  -> 10%',           percentForOrders(1), 10);
check('2 compras -> 12%',           percentForOrders(2), 12);
check('3 compras -> 15%',           percentForOrders(3), 15);
check('5 compras -> 15% (tope)',    percentForOrders(5), 15);
check('12 compras-> 15% (tope)',    percentForOrders(12), 15);

console.log('\n--- lo que ve el cliente ---');
check('con 0: le falta 1 para el 10%', statusFromOrders(0), {orders:0,percent:0,toNext:1,nextPercent:10});
check('con 1: le falta 1 para el 12%', statusFromOrders(1), {orders:1,percent:10,toNext:1,nextPercent:12});
check('con 2: le falta 1 para el 15%', statusFromOrders(2), {orders:2,percent:12,toNext:1,nextPercent:15});
check('con 3: ya está al tope',        statusFromOrders(3), {orders:3,percent:15,toNext:null,nextPercent:null});

console.log('\n--- el código es de ese cliente Y de ese nivel ---');
const hoy = new Date('2026-09-08T12:00:00Z');
const ana15 = loyaltyCode('ana@test.com', 15, hoy)!;
check('tiene prefijo FID-', isLoyaltyCode(ana15), true);
check('vale para ana al 15%', verifyLoyaltyCode('ana@test.com', 15, ana15, hoy), true);
check('NO vale para otro mail', verifyLoyaltyCode('beto@test.com', 15, ana15, hoy), false);
check('NO vale para otro nivel', verifyLoyaltyCode('ana@test.com', 12, ana15, hoy), false);
check('al subir de nivel cambia el código', loyaltyCode('ana@test.com', 12, hoy) !== ana15, true);
check('inventado no pasa', verifyLoyaltyCode('ana@test.com', 15, 'FID-XXXXXXXX', hoy), false);

console.log('\n--- vigencia y bordes ---');
const dia = 86400_000;
check('sirve a los 40 días', verifyLoyaltyCode('ana@test.com', 15, ana15, new Date(hoy.getTime()+40*dia)), true);
check('a los 150 días venció', verifyLoyaltyCode('ana@test.com', 15, ana15, new Date(hoy.getTime()+150*dia)), false);
check('no se emite con 0%', loyaltyCode('ana@test.com', 0, hoy), null);
check('no valida con 0%', verifyLoyaltyCode('ana@test.com', 0, ana15, hoy), false);
check('umbral configurado', LOYALTY.minOrderAmount, 30000);

console.log('\n--- sin secreto ---');
delete process.env.CRON_SECRET; delete process.env.WELCOME_SECRET;
check('no emite', loyaltyCode('ana@test.com', 15, hoy), null);
check('no acepta', verifyLoyaltyCode('ana@test.com', 15, ana15, hoy), false);

console.log(fail === 0 ? '\nTodo OK' : `\n${fail} fallaron`);
process.exit(fail === 0 ? 0 : 1);
