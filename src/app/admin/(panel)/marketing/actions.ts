'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter, logActivity } from '@/lib/admin/actions-helpers';
import { getCurrentProfile } from '@/lib/admin/auth';
import { sendEmailDetailed } from '@/lib/email';
import {
  ASUNTO_BAJA_PRECIOS,
  avisoBajaPreciosHtml,
  EJEMPLOS_BAJA_PRECIOS,
  promoSemanaHtml,
  type ItemPromoMail,
} from '@/lib/avisos';
import { promoLineaVigente, promoLineaHasta } from '@/lib/promo-linea';

export interface EnvioResult {
  ok?: boolean;
  error?: string;
  enviados?: number;
  fallados?: number;
  detalle?: string[];
}

/**
 * Manda el aviso de baja de precios a los suscriptores del popup.
 *
 * Tres cosas a propósito:
 *
 *  - Va de a uno, no en copia oculta: cada persona recibe su mail con su
 *    nombre, y si uno rebota no se cae el resto.
 *  - Con una pausa entre envíos, porque Resend limita por segundo y sin eso
 *    la mitad vuelve con 429 y parece que "no anduvo".
 *  - Queda asentado en el historial quién lo mandó y a cuántos. Un mail a toda
 *    la lista es algo que se hace una vez; conviene que quede escrito.
 */
export async function enviarAvisoBajaPrecios(
  /** Solo al dueño, para verlo en la casilla antes de mandarlo a todos. */
  soloPrueba = false,
): Promise<EnvioResult> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = await createClient();
  const perfil = await getCurrentProfile();

  const { data: subs } = await supabase
    .from('welcome_signups')
    .select('email, name')
    .order('created_at');

  const destinatarios = soloPrueba
    ? (subs ?? []).filter(
        (s: { email: string }) => s.email.toLowerCase() === (perfil?.email || '').toLowerCase(),
      )
    : (subs ?? []);

  if (destinatarios.length === 0) {
    return {
      error: soloPrueba
        ? 'Tu mail no está en la lista de suscriptores, así que no hay a quién mandarle la prueba.'
        : 'No hay suscriptores.',
    };
  }

  let enviados = 0;
  const fallos: string[] = [];

  for (const s of destinatarios as { email: string; name: string }[]) {
    const r = await sendEmailDetailed({
      to: s.email,
      subject: ASUNTO_BAJA_PRECIOS,
      html: avisoBajaPreciosHtml(s.name || '', EJEMPLOS_BAJA_PRECIOS),
    });
    if (r.ok) enviados++;
    else fallos.push(`${s.email}: ${r.error ?? 'error'}`);
    // Resend acepta ~2 por segundo; sin esta pausa la mitad vuelve con 429.
    await new Promise((res) => setTimeout(res, 600));
  }

  if (!soloPrueba) {
    await logActivity('send', 'aviso_precios', perfil?.email ?? 'admin', {
      enviados,
      fallados: fallos.length,
    });
  }

  revalidatePath('/admin/marketing');
  return { ok: true, enviados, fallados: fallos.length, detalle: fallos.slice(0, 8) };
}

/* ------------------------------------------------------------------ */

export interface PromoSemana {
  label: string;
  bajada: string;
  hasta: string;
  items?: ItemPromoMail[];
  codigo?: string;
  monto?: number;
  minimo?: number;
}

/**
 * Qué promo está corriendo esta semana, para el mail.
 *
 * Lee de las dos fuentes de verdad y no de una copia: el calendario de
 * `promo-linea.ts` para las de precio fijo, y la tabla `promotions` para las de
 * cupón. Si se escribieran los datos a mano acá, cualquier cambio en una promo
 * saldría bien en la página y mal en el mail — y el mail es el que la gente
 * guarda.
 *
 * Devuelve null si esta semana no hay nada, que es una respuesta válida: no
 * todas las semanas tiene que haber promo.
 */
export async function promoDeLaSemana(): Promise<PromoSemana | null> {
  const promo = promoLineaVigente();

  if (promo) {
    const supabase = await createClient();
    const { data: prods } = await supabase
      .from('products')
      .select('slug, name, product_variants(size, stock_physical, stock_reserved, encargo_reserved, active)')
      .in('slug', promo.items.map((i) => i.slug));

    const items: ItemPromoMail[] = [];
    for (const i of promo.items) {
      const p = (prods ?? []).find((x: { slug: string }) => x.slug === i.slug);
      if (!p) continue;
      // Solo los talles que se pueden comprar de verdad. Anunciar un talle
      // agotado es la forma más rápida de que alguien entre, no lo encuentre y
      // no vuelva.
      const talles = ((p as { product_variants?: unknown[] }).product_variants ?? [])
        .filter((v) => {
          const x = v as { active: boolean; stock_physical: number; stock_reserved: number; encargo_reserved: number | null };
          return x.active && x.stock_physical - x.stock_reserved - (x.encargo_reserved ?? 0) > 0;
        })
        .map((v) => (v as { size: string }).size)
        .join(' · ');
      if (!talles) continue; // agotado: no va al mail
      items.push({
        name: (p as { name: string }).name,
        antes: i.compare_price,
        ahora: i.price,
        talles,
      });
    }

    if (items.length === 0) return null;
    return {
      label: promo.label,
      bajada: `${promo.subtitle}, a precio de promo.`,
      hasta: promoLineaHasta(),
      items,
    };
  }

  // Sin promo de precio fijo: ¿hay algún cupón vigente esta semana?
  const supabase = await createClient();
  const ahora = new Date().toISOString();
  const { data: cupones } = await supabase
    .from('promotions')
    .select('code, name, fixed_amount, minimum_amount, end_date')
    .eq('active', true)
    .not('code', 'is', null)
    .not('start_date', 'is', null)
    .lte('start_date', ahora)
    .gte('end_date', ahora)
    .order('start_date', { ascending: false })
    .limit(1);

  const c = (cupones ?? [])[0] as
    | { code: string; name: string; fixed_amount: number | null; minimum_amount: number | null; end_date: string }
    | undefined;
  if (!c || !c.fixed_amount) return null;

  return {
    label: c.name.replace(/\s*\(.*\)\s*$/, ''),
    bajada: 'tenés un código para usar esta semana.',
    hasta: new Date(c.end_date).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Argentina/Buenos_Aires',
    }),
    codigo: c.code,
    monto: Number(c.fixed_amount),
    minimo: c.minimum_amount ? Number(c.minimum_amount) : undefined,
  };
}

/**
 * Manda el mail de la promo de la semana a los suscriptores.
 *
 * Mismo criterio que el aviso de precios: de a uno, con pausa, y queda
 * asentado. No se manda solo: con 18 suscriptores, un mail por semana es un
 * mail por semana — conviene que sea alguien quien decida apretar el botón.
 */
export async function enviarPromoSemana(soloPrueba = false): Promise<EnvioResult> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const promo = await promoDeLaSemana();
  if (!promo) return { error: 'Esta semana no hay ninguna promo corriendo, así que no hay nada para anunciar.' };

  const supabase = await createClient();
  const perfil = await getCurrentProfile();

  const { data: subs } = await supabase
    .from('welcome_signups')
    .select('email, name')
    .order('created_at');

  const destinatarios = soloPrueba
    ? (subs ?? []).filter(
        (s: { email: string }) => s.email.toLowerCase() === (perfil?.email || '').toLowerCase(),
      )
    : (subs ?? []);

  if (destinatarios.length === 0) {
    return {
      error: soloPrueba
        ? 'Tu mail no está en la lista de suscriptores, así que no hay a quién mandarle la prueba.'
        : 'No hay suscriptores.',
    };
  }

  let enviados = 0;
  const fallos: string[] = [];

  for (const s of destinatarios as { email: string; name: string }[]) {
    const r = await sendEmailDetailed({
      to: s.email,
      subject: `${promo.label} — solo esta semana`,
      html: promoSemanaHtml({ ...promo, nombre: s.name || '' }),
    });
    if (r.ok) enviados++;
    else fallos.push(`${s.email}: ${r.error ?? 'error'}`);
    await new Promise((res) => setTimeout(res, 600));
  }

  if (!soloPrueba) {
    await logActivity('send', 'promo_semana', perfil?.email ?? 'admin', {
      promo: promo.label,
      enviados,
      fallados: fallos.length,
    });
  }

  revalidatePath('/admin/marketing');
  return { ok: true, enviados, fallados: fallos.length, detalle: fallos.slice(0, 8) };
}
