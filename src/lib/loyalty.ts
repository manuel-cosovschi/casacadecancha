import { createHmac } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Programa de fidelidad: descuentos por cantidad de compras grandes.
 *
 *   1 compra  de más de $100.000 -> 10%
 *   2 compras de más de $100.000 -> 15%
 *   3 o más                      -> 20% (tope)
 *
 * El umbral se mide sobre el SUBTOTAL del pedido, antes de descuentos. Si se
 * midiera sobre el total, usar un cupón podría descalificar la compra, y una
 * compra de $120.000 con 20% dejaría de contar justo por ser buen cliente.
 *
 * A diferencia del cupón de bienvenida, esto FALLA CERRADO sin la base: el
 * nivel es una función del historial de compras, y no hay firma que sustituya
 * ese dato. Firmar el nivel sin poder verificarlo sería dejar que cualquiera
 * se autoproclame nivel 3.
 *
 * El descuento se aplica SOLO con el email, sin cuenta y sin código: con
 * escribir su mail en el checkout, al cliente le aparece el nivel que le
 * corresponde. Los códigos `FID-` de abajo siguen andando para mandarlos a
 * mano por WhatsApp, pero ya no son el camino principal.
 */
// Los escalones y el umbral viven en `loyalty-tiers` para que el carrito
// pueda importarlos sin arrastrar `crypto` al bundle del navegador.
// Se re-exportan acá para no romper a quien ya importaba desde este módulo.
export {
  LOYALTY,
  percentForOrders,
  statusFromOrders,
  FIRST_TIER_PERCENT,
} from './loyalty-tiers';
export type { LoyaltyStatus } from './loyalty-tiers';

import { LOYALTY, statusFromOrders } from './loyalty-tiers';
import type { LoyaltyStatus } from './loyalty-tiers';

function secret(): string | null {
  return process.env.WELCOME_SECRET || process.env.CRON_SECRET || null;
}

function bucketNow(now: Date): number {
  return Math.floor(now.getTime() / (LOYALTY.windowDays * 86400_000));
}

function sign(email: string, percent: number, bucket: number, key: string): string {
  const mac = createHmac('sha256', key)
    .update(`fid|${email.trim().toLowerCase()}|${percent}|${bucket}`)
    .digest('base64')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .replace(/[OI01]/g, '');
  return LOYALTY.prefix + mac.slice(0, 8);
}

/** Código personal para ese cliente y ese nivel. null si falta el secreto. */
export function loyaltyCode(
  email: string,
  percent: number,
  now: Date = new Date(),
): string | null {
  const key = secret();
  if (!key || percent <= 0) return null;
  return sign(email, percent, bucketNow(now), key);
}

/** ¿El código es de ese cliente, para ese nivel, y sigue vigente? */
export function verifyLoyaltyCode(
  email: string,
  percent: number,
  code: string,
  now: Date = new Date(),
): boolean {
  const key = secret();
  if (!key || !email || !code || percent <= 0) return false;
  const given = code.trim().toUpperCase();
  const b = bucketNow(now);
  return (
    given === sign(email, percent, b, key) ||
    given === sign(email, percent, b - 1, key)
  );
}

export function isLoyaltyCode(code: string): boolean {
  return (code || '').trim().toUpperCase().startsWith(LOYALTY.prefix);
}

/**
 * Nivel de fidelidad de ese email, sin código de por medio.
 *
 * Es la vía principal: el checkout la llama apenas el cliente escribe su mail
 * y aplica el descuento solo. Falla cerrado — si la base no contesta, no hay
 * descuento — porque el nivel sale del historial de compras y no hay forma de
 * suponerlo sin mentir.
 *
 * El porcentaje sale de la base (`loyalty_config`, editable sin deploy); la
 * cantidad de compras y el próximo escalón se arman acá solo para mostrarlos.
 */
export async function loyaltyForEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<LoyaltyStatus & { ok: boolean }> {
  const none = { ...statusFromOrders(0), ok: false };
  const clean = (email || '').trim().toLowerCase();
  if (!LOYALTY.active || !clean.includes('@')) return none;

  try {
    const { data, error } = await supabase.rpc('loyalty_percent_for_email', {
      p_email: clean,
    });
    if (error || !data) return none;
    const orders = Number((data as any).orders) || 0;
    // El porcentaje manda la base: si el dueño cambia los escalones desde
    // `loyalty_config`, el checkout lo respeta sin tocar el código.
    const percent = Number((data as any).percent) || 0;
    return { ...statusFromOrders(orders), percent, ok: true };
  } catch {
    return none;
  }
}

export interface LoyaltyCheck {
  valid: boolean;
  percent: number;
  message: string;
}

/**
 * Valida un cupón de fidelidad contra el historial real del cliente.
 *
 * Falla cerrado: si `loyalty_percent_for_email` no existe (migración 0032 sin
 * aplicar) o la consulta falla, se rechaza. El nivel no se puede suponer.
 */
export async function checkLoyalty(
  supabase: SupabaseClient,
  email: string,
  code: string,
): Promise<LoyaltyCheck> {
  const clean = (email || '').trim().toLowerCase();
  if (!clean.includes('@')) {
    return { valid: false, percent: 0, message: 'Completá tu email para validar el cupón.' };
  }

  const { data, error } = await supabase.rpc('loyalty_percent_for_email', {
    p_email: clean,
  });

  if (error || !data) {
    return {
      valid: false,
      percent: 0,
      message:
        'No pudimos validar tu cupón de cliente en este momento. Escribinos por WhatsApp y lo aplicamos a mano.',
    };
  }

  const percent = Number((data as any).percent) || 0;
  if (percent <= 0) {
    return {
      valid: false,
      percent: 0,
      message: `Este cupón es para clientes con al menos una compra de más de $${LOYALTY.minOrderAmount.toLocaleString('es-AR')}.`,
    };
  }

  // El código tiene que ser de ese mail Y de ese nivel: si subió de nivel, el
  // código viejo deja de servir y usa el nuevo.
  if (!verifyLoyaltyCode(clean, percent, code)) {
    return {
      valid: false,
      percent: 0,
      message: 'Ese código no corresponde a este email o ya venció. Mirá el vigente en tu cuenta.',
    };
  }

  return { valid: true, percent, message: `Cupón de cliente aplicado: ${percent}% OFF.` };
}
