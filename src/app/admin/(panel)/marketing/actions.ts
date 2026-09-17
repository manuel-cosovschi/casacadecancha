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
} from '@/lib/avisos';

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
