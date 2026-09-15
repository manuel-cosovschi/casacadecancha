import { createHmac } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Descuento de bienvenida: 5% en la primera compra, a cambio del mail.
 *
 * Es menos que antes, pero **se acumula**: vale también sobre las camisetas que
 * ya están en promo. El anterior era más grande y no se combinaba con nada, así
 * que justo cuando había una promo buena el código no servía para nada.
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
 * el descuento a todo el mundo para siempre. Cuando la RPC exista, manda ella y
 * el control vuelve a ser exacto, sin tocar nada.
 */

/**
 * Un nivel de descuento de bienvenida.
 *
 * Conviven dos porque cuando bajó de 10% a 5% ya había códigos dando vueltas en
 * los mails de la gente, prometiendo el 10%. Esos se respetan hasta que se
 * vencen solos; los nuevos salen al 5%.
 *
 * Cuál es cuál lo dice **el código mismo**, por el prefijo. Así no hace falta
 * guardar nada en la base ni preguntarle a nadie: se lee del cupón que el
 * cliente tipea.
 */
interface NivelBienvenida {
  /** Con qué arranca el código. Los prefijos no se solapan entre niveles. */
  prefix: string;
  percent: number;
  /**
   * Etiqueta que entra DENTRO de la firma.
   *
   * Es lo que impide que alguien con un código nuevo le cambie el prefijo a
   * mano y se lleve el descuento viejo, que es más grande: como la etiqueta se
   * firma junto con el mail, los dos códigos tienen firmas distintas y uno no
   * se puede convertir en el otro.
   *
   * `null` es la firma original, sin etiqueta: no se puede tocar sin invalidar
   * los códigos que ya están en la calle.
   */
  tag: string | null;
}

/** El que se emite de ahora en más. */
const NIVEL_ACTUAL: NivelBienvenida = { prefix: 'BV5-', percent: 5, tag: '5' };

/** Los que ya salieron por mail prometiendo 10%. Se vencen solos en 30-60 días. */
const NIVEL_ANTERIOR: NivelBienvenida = { prefix: 'BV-', percent: 10, tag: null };

const NIVELES: NivelBienvenida[] = [NIVEL_ACTUAL, NIVEL_ANTERIOR];

/**
 * Cuándo se pasó de 10% a 5%.
 *
 * Solo se usa para saber qué código mostrarle en el panel a cada suscriptor:
 * al que se anotó antes hay que mostrarle el de 10%, que es el que tiene en el
 * mail. Para validar en el checkout no hace falta, porque ahí el porcentaje
 * sale del código.
 *
 * Cuando no quede ningún suscriptor anterior a esta fecha, se puede borrar
 * NIVEL_ANTERIOR y todo esto se simplifica solo.
 */
export const CAMBIO_A_5 = new Date('2026-09-15T20:45:00-03:00');

export const WELCOME = {
  active: true,
  percent: NIVEL_ACTUAL.percent,
  prefix: NIVEL_ACTUAL.prefix,
  /** Días que dura cada ventana de emisión. El código vale 1 o 2 ventanas. */
  windowDays: 30,
  label: `${NIVEL_ACTUAL.percent}% OFF en tu primera compra`,
  /**
   * Este sí se combina con las promos, a diferencia del cupón común y del
   * descuento por ser cliente. Es la contrapartida de que sea más chico.
   */
  acumulable: true,
};

/** Secreto de firma. Sin secreto no se emite ni se acepta ningún código. */
function secret(): string | null {
  return process.env.WELCOME_SECRET || process.env.CRON_SECRET || null;
}

function bucketNow(now: Date): number {
  return Math.floor(now.getTime() / (WELCOME.windowDays * 86400_000));
}

function sign(email: string, bucket: number, key: string, nivel: NivelBienvenida): string {
  // La etiqueta del nivel va adentro de la firma: sin eso, cambiarle el prefijo
  // a un código de 5% lo convertiría en uno de 10%.
  const payload =
    nivel.tag === null
      ? `${email.trim().toLowerCase()}|${bucket}`
      : `${email.trim().toLowerCase()}|${bucket}|${nivel.tag}`;
  const mac = createHmac('sha256', key)
    .update(payload)
    .digest('base64')
    // Sin caracteres ambiguos ni raros: el cliente lo tipea a mano.
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .replace(/[OI01]/g, '');
  return nivel.prefix + mac.slice(0, 8);
}

/** Código personal para ese email, al porcentaje que se emite hoy. */
export function personalCode(email: string, now: Date = new Date()): string | null {
  const key = secret();
  if (!key) return null;
  return sign(email, bucketNow(now), key, NIVEL_ACTUAL);
}

/**
 * El código que tiene en el mail alguien que se suscribió en tal fecha.
 *
 * Lo usa el panel: al que se anotó antes del cambio hay que mostrarle su código
 * de 10%, no uno nuevo de 5% que él nunca recibió.
 */
export function codigoEmitido(
  email: string,
  emitidoEn: Date | string,
  now: Date = new Date(),
): string | null {
  const key = secret();
  if (!key) return null;
  const fecha = emitidoEn instanceof Date ? emitidoEn : new Date(emitidoEn);
  const nivel =
    !Number.isNaN(fecha.getTime()) && fecha < CAMBIO_A_5 ? NIVEL_ANTERIOR : NIVEL_ACTUAL;
  return sign(email, bucketNow(now), key, nivel);
}

/** Cuánto descuenta el código que tiene en el mail quien se suscribió ese día. */
export function percentEmitido(emitidoEn: Date | string): number {
  const fecha = emitidoEn instanceof Date ? emitidoEn : new Date(emitidoEn);
  if (!Number.isNaN(fecha.getTime()) && fecha < CAMBIO_A_5) return NIVEL_ANTERIOR.percent;
  return NIVEL_ACTUAL.percent;
}

/**
 * Qué nivel es ese código para ese mail, o null si no es de ese mail o venció.
 *
 * Acá sale el porcentaje que se aplica: del código, no de la configuración. Por
 * eso los que se emitieron al 10% siguen descontando 10% aunque hoy se emitan
 * al 5%.
 */
function nivelDeCodigo(
  email: string,
  code: string,
  now: Date = new Date(),
): NivelBienvenida | null {
  const key = secret();
  if (!key || !email || !code) return null;
  const given = code.trim().toUpperCase();
  const b = bucketNow(now);
  for (const nivel of NIVELES) {
    if (!given.startsWith(nivel.prefix)) continue;
    // Se acepta la ventana actual y la anterior: quien se suscribió el día 29
    // igual tiene un mes para usarlo.
    if (given === sign(email, b, key, nivel) || given === sign(email, b - 1, key, nivel)) {
      return nivel;
    }
  }
  return null;
}

/** ¿El código pertenece a ese email y sigue vigente? */
export function verifyPersonalCode(
  email: string,
  code: string,
  now: Date = new Date(),
): boolean {
  return nivelDeCodigo(email, code, now) !== null;
}

/** ¿Parece un código de bienvenida? (para enrutar la validación) */
export function isWelcomeCode(code: string): boolean {
  const c = (code || '').trim().toUpperCase();
  return NIVELES.some((n) => c.startsWith(n.prefix));
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
  /**
   * Cuánto descuenta ESTE código. Sale del código y no de la configuración:
   * los que se emitieron al 10% siguen valiendo 10% hasta que se vencen.
   */
  percent: number;
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
  // Cuando todavía no se sabe de qué código se trata, el porcentaje que se
  // informa es el que se emite hoy: es lo que corresponde a alguien que se
  // suscriba ahora.
  const noAplica = { eligible: false as const, via: null, percent: WELCOME.percent };

  if (!clean.includes('@')) {
    return {
      ...noAplica,
      message: 'Completá tu email para validar el descuento de bienvenida.',
    };
  }

  // El código tiene que ser de ese mail, exista o no la RPC. De acá sale además
  // cuánto descuenta: los emitidos antes del cambio valen más.
  const nivel = nivelDeCodigo(clean, code);
  if (!nivel) {
    return {
      ...noAplica,
      message:
        'Ese código no corresponde a este email, o ya venció. Revisá el mail que te enviamos.',
    };
  }
  const percent = nivel.percent;

  // El DNI se pide SOLO acá: quien paga precio normal no lo completa nunca.
  // Sin él, cambiar de mail y de teléfono alcanza para repetir el descuento.
  if (!looksLikeDni(dni)) {
    return {
      eligible: false,
      via: null,
      percent,
      message: 'Completá tu DNI para usar el descuento de primera compra.',
    };
  }

  // Verificación cruzada: mail, teléfono y DNI.
  const hit = await buscarCompraPrevia(supabase, clean, phone, dni);
  if (hit) {
    if (hit.orders > 0) {
      return { eligible: false, via: 'rpc', percent, message: motivoYaUsado(hit) };
    }
    return {
      eligible: true,
      via: 'rpc',
      percent,
      message: 'Descuento de bienvenida aplicado.',
    };
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
        percent,
        message: 'El descuento de bienvenida es solo para la primera compra.',
      };
    }
    return {
      eligible: true,
      via: 'rpc',
      percent,
      message: 'Descuento de bienvenida aplicado.',
    };
  }

  // Sin RPC: vale el código personal, que ya validamos arriba.
  return {
    eligible: true,
    via: 'code',
    percent,
    message: 'Descuento de bienvenida aplicado.',
  };
}
