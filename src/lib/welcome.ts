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

/**
 * ¿Tiene pinta de DNI argentino?
 *
 * Mismo criterio que `norm_dni` en la base (migración 0037): los dos tienen
 * que coincidir o el checkout aceptaría algo que después la base ignora.
 */
export function looksLikeDni(dni?: string | null): boolean {
  const d = (dni || '').replace(/\D/g, '');
  return d.length >= 7 && d.length <= 9;
}

export interface WelcomeEligibility {
  eligible: boolean;
  /** 'rpc' = verificado contra el historial real. 'code' = código personal. */
  via: 'rpc' | 'code' | null;
  message: string;
}

/** Qué encontró `first_purchase_check` en el historial. */
interface PrimeraCompra {
  /** Compras previas de esa persona, por cualquiera de las tres señales. */
  orders: number;
  /** De esas, cuántas usaron un código de bienvenida. */
  welcome_orders: number;
  /** Con qué señal se la reconoció. */
  via: 'dni' | 'phone' | 'email' | null;
}

/**
 * ¿Esta persona ya compró antes? Cruza mail, teléfono y DNI.
 *
 * El código está firmado contra el mail, así que para repetirlo alcanza con
 * usar otro — y con Gmail ni siquiera hace falta crear una casilla nueva.
 * Por eso no se pregunta "¿este mail compró?" sino "¿esta persona compró?".
 *
 * Devuelve null si la base todavía no tiene la función (migración 0037 sin
 * aplicar): ahí manda el chequeo viejo, que al menos cubre el mail.
 */
async function buscarCompraPrevia(
  supabase: SupabaseClient,
  email: string,
  phone?: string | null,
  dni?: string | null,
): Promise<PrimeraCompra | null> {
  const { data, error } = await supabase.rpc('first_purchase_check', {
    p_email: email,
    p_phone: phone || null,
    p_dni: dni || null,
  });
  if (error || !data) return null;
  const d = data as Record<string, unknown>;
  return {
    orders: Number(d.orders) || 0,
    welcome_orders: Number(d.welcome_orders) || 0,
    via: (d.via as PrimeraCompra['via']) ?? null,
  };
}

/** Qué se le dice a alguien que ya usó el beneficio, según cómo se lo reconoció. */
function motivoYaUsado(hit: PrimeraCompra): string {
  const cierre =
    ' Si creés que es un error, escribinos por WhatsApp y lo vemos.';
  if (hit.welcome_orders > 0) {
    if (hit.via === 'dni') {
      return `Ese DNI ya usó el descuento de primera compra.${cierre}`;
    }
    if (hit.via === 'phone') {
      return `Ese WhatsApp ya usó el descuento de primera compra.${cierre}`;
    }
    return `Ya usaste el descuento de primera compra.${cierre}`;
  }
  if (hit.via === 'dni') {
    return `Ese DNI ya tiene compras, así que no es una primera compra.${cierre}`;
  }
  if (hit.via === 'phone') {
    return `Ese WhatsApp ya tiene compras, así que no es una primera compra.${cierre}`;
  }
  return 'El descuento de bienvenida es solo para la primera compra.';
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
  phone?: string | null,
  dni?: string | null,
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

  // El DNI se pide SOLO acá: quien paga precio normal no lo completa nunca.
  // Sin él, cambiar de mail y de teléfono alcanza para repetir el descuento.
  if (!looksLikeDni(dni)) {
    return {
      eligible: false,
      via: null,
      message: 'Completá tu DNI para usar el descuento de primera compra.',
    };
  }

  // Verificación cruzada: mail, teléfono y DNI.
  const hit = await buscarCompraPrevia(supabase, clean, phone, dni);
  if (hit) {
    if (hit.orders > 0) {
      return { eligible: false, via: 'rpc', message: motivoYaUsado(hit) };
    }
    return { eligible: true, via: 'rpc', message: 'Descuento de bienvenida aplicado.' };
  }

  // Sin la función nueva: al menos el chequeo viejo, que cubre el mail.
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
