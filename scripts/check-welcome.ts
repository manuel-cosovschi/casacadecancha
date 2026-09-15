/**
 * Chequeo de la lógica del código de bienvenida.
 *   npx tsx scripts/check-welcome.ts
 */
process.env.CRON_SECRET = process.env.CRON_SECRET || 'secreto-de-prueba';
import {
  personalCode,
  verifyPersonalCode,
  isWelcomeCode,
  codigoEmitido,
  percentEmitido,
  WELCOME,
  CAMBIO_A_5,
} from '../src/lib/welcome';

let fail = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) fail++;
  console.log(`${ok ? 'OK  ' : 'FALLA'} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (esperado ${JSON.stringify(expected)})`}`);
};

const ana = 'ana@test.com', beto = 'beto@test.com';
const hoy = new Date('2026-09-07T12:00:00Z');
const codeAna = personalCode(ana, hoy)!;

console.log('--- emisión ---');
check('tiene el prefijo', codeAna.startsWith(WELCOME.prefix), true);
check('lo reconoce como cupón de bienvenida', isWelcomeCode(codeAna), true);
check('es determinístico', personalCode(ana, hoy), codeAna);
check('distinto por persona', personalCode(beto, hoy) !== codeAna, true);
check('sin caracteres ambiguos (O I 0 1)', /[OI01]/.test(codeAna.slice(WELCOME.prefix.length)), false);

console.log('\n--- el código es de ESE mail ---');
check('vale para su dueño', verifyPersonalCode(ana, codeAna, hoy), true);
check('NO vale para otro mail', verifyPersonalCode(beto, codeAna, hoy), false);
check('no importan mayúsculas', verifyPersonalCode('ANA@TEST.COM', codeAna.toLowerCase(), hoy), true);
check('código inventado no pasa', verifyPersonalCode(ana, 'BV-XXXXXXXX', hoy), false);
check('vacío no pasa', verifyPersonalCode(ana, '', hoy), false);

console.log('\n--- vigencia ---');
const dia = 86400_000;
check('sirve a los 20 días', verifyPersonalCode(ana, codeAna, new Date(hoy.getTime() + 20*dia)), true);
const lejos = new Date(hoy.getTime() + 75*dia);
check('a los 75 días ya venció', verifyPersonalCode(ana, codeAna, lejos), false);

console.log('\n--- los dos niveles: 5% nuevo, 10% para los ya emitidos ---');
const antes = new Date(CAMBIO_A_5.getTime() - 86400_000);
const despues = new Date(CAMBIO_A_5.getTime() + 86400_000);
check('hoy se emite al 5%', WELCOME.percent, 5);
check('el que se anotó antes del cambio tiene 10%', percentEmitido(antes), 10);
check('el que se anota después, 5%', percentEmitido(despues), 5);

const viejo = codigoEmitido(ana, antes, hoy)!;
const nuevo = codigoEmitido(ana, despues, hoy)!;
check('al viejo se le muestra su código BV-', viejo.startsWith('BV-'), true);
check('al nuevo, uno BV5-', nuevo.startsWith('BV5-'), true);
check('el checkout reconoce los dos', isWelcomeCode(viejo) && isWelcomeCode(nuevo), true);
check('los dos valen para su dueño', verifyPersonalCode(ana, viejo, hoy) && verifyPersonalCode(ana, nuevo, hoy), true);
check('ninguno vale para otro mail', verifyPersonalCode(beto, viejo, hoy) || verifyPersonalCode(beto, nuevo, hoy), false);

// Lo importante: que no se pueda pasar del de 5% al de 10% cambiando el prefijo.
const trucho = 'BV-' + nuevo.slice('BV5-'.length);
check('cambiarle el prefijo al de 5% NO da el de 10%', verifyPersonalCode(ana, trucho, hoy), false);
check('y las dos firmas son distintas', viejo === trucho, false);

console.log('\n--- sin secreto no se emite ni se acepta ---');
delete process.env.CRON_SECRET; delete process.env.WELCOME_SECRET;
check('no emite', personalCode(ana, hoy), null);
check('no acepta', verifyPersonalCode(ana, codeAna, hoy), false);

console.log(fail === 0 ? '\nTodo OK' : `\n${fail} fallaron`);
process.exit(fail === 0 ? 0 : 1);
