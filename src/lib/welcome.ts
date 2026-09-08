import { createHmac } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Descuento de bienvenida: 10% en la primera compra, a cambio del mail.
 *
 * Verificar "primera compra" de verdad exige contar los pedidos previos de ese
 * email, y el storefront no puede leer `orders` (RLS: solo is_admin). La
 * migración 0031 agrega `orders_count_for_email` para eso.
 *
 * Mientras esa migración no esté aplicada, el descuento igual funciona, pero
 * con un control más débil y acotado: a cada suscriptor se le emite un CÓDIGO
 * PERSONAL derivado de su propio mail con HMAC. Ese código:
 *
 *   - solo lo tiene quien dejó el mail,
 *   - solo sirve con ESE mail en el checkout (no se puede pasar a un amigo),
 *   - se vence solo a los 30-60 días.
 *
 * Lo único que ese control NO impide es que la misma persona lo use dos veces
 * dentro de la ventana. Es una fuga chica y acotada, muy distinta de regalarle
 * el 10% a todo el mundo para siempre. Cuando la RPC exista, manda ella y el
 * control vuelve a ser exacto, sin tocar nada.
 */
export const WELCOME = {
  active: true,
  percent: 10,
  prefix: 'BV-',
  /** Días que dura cada ventana de emisión. El código vale 1 o 2 ventanas. */
  windowDays: 30,
  label: '10% OFF en tu primera compra',
};

/** Secreto de firma. Sin secreto no se emite ni se acepta ningún código. */
function secret(): string | null {
  return process.env.WELCOME_SECRET || process.env.CRON_SECRET || null;
}

function bucketNow(now: Date): number {
  return Math.floor(now.getTime() / (WELCOME.windowDays * 86400_000));
}

function sign(email: string, bucket: number, key: string): string {
  const mac = createHmac('sha256', key)
    .update(`${email.trim().toLowerCase()}|${bucket}`)
    .digest('base64')
    // Sin caracteres ambiguos ni raros: el cliente lo tipea a mano.
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .replace(/[OI01]/g, '');
  return WELCOME.prefix + mac.slice(0, 8);
}

/** Código personal para ese email. null si no hay secreto configurado. */
export function personalCode(email: string, now: Date = new Date()): string | null {
  const key = secret();
  if (!key) return null;
  return sign(email, bucketNow(now), key);
}

/** ¿El código pertenece a ese email y sigue vigente? */
export function verifyPersonalCode(
  email: string,
  code: string,
  now: Date = new Date(),
): boolean {
  const key = secret();
  if (!key || !email || !code) return false;
  const given = code.trim().toUpperCase();
  const b = bucketNow(now);
  // Se acepta la ventana actual y la anterior: quien se suscribió el día 29
  // igual tiene un mes para usarlo.
  return given === sign(email, b, key) || given === sign(email, b - 1, key);
}

/** ¿Parece un código de bienvenida? (para enrutar la validación) */
export function isWelcomeCode(code: string): boolean {
  return (code || '').trim().toUpperCase().startsWith(WELCOME.prefix);
}

export interface WelcomeEligibility {
  eligible: boolean;
  /** 'rpc' = verificado contra el historial real. 'code' = código personal. */
  via: 'rpc' | 'code' | null;
  message: string;
}

/**
 * Decide si corresponde el descuento.
 *
 * Prioridad:
 *   1. Si existe `orders_count_for_email`, manda ella: es la verificación real
 *      de primera compra.
 *   2. Si no existe, se valida el código personal contra el email.
 *   3. Ante cualquier otra cosa, se rechaza.
 */
export async function checkWelcomeEligibility(
  supabase: SupabaseClient,
  email: string,
  code: string,
): Promise<WelcomeEligibility> {
  const clean = (email || '').trim().toLowerCase();
  if (!clean.includes('@')) {
    return {
      eligible: false,
      via: null,
      message: 'Completá tu email para validar el descuento de bienvenida.',
    };
  }

  // El código tiene que ser de ese mail, exista o no la RPC.
  if (!verifyPersonalCode(clean, code)) {
    return {
      eligible: false,
      via: null,
      message:
        'Ese código no corresponde a este email, o ya venció. Revisá el mail que te enviamos.',
    };
  }

  // Verificación real de primera compra, si la base puede responderla.
  const { data, error } = await supabase.rpc('orders_count_for_email', {
    p_email: clean,
  });

  if (!error && data !== null && data !== undefined) {
    const orders = Number(data) || 0;
    if (orders > 0) {
      return {
        eligible: false,
        via: 'rpc',
        message: 'El descuento de bienvenida es solo para la primera compra.',
      };
    }
    return { eligible: true, via: 'rpc', message: 'Descuento de bienvenida aplicado.' };
  }

  // Sin RPC: vale el código personal, que ya validamos arriba.
  return { eligible: true, via: 'code', message: 'Descuento de bienvenida aplicado.' };
}
