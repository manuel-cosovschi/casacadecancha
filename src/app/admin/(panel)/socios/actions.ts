'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter } from '@/lib/admin/actions-helpers';
import { sendEmail } from '@/lib/email';
import { bienvenidaSocioHtml } from '@/lib/avisos';
import { SOCIO, numeroDeSocio } from '@/lib/socios';

/**
 * Da de baja un carnet a mano.
 *
 * No borra la fila ni le saca el número: el socio queda registrado con su baja
 * puesta, así si vuelve el mes que viene recupera el mismo número. Los
 * beneficios se cortan en el acto porque `socio_estado` deja afuera a quien
 * tiene `baja_el`.
 *
 * Lo que NO hace: devolver plata. No hay nada que devolver — la cuota que ya
 * entró es por el mes que ya se usó.
 */
export async function darDeBajaSocio(id: string): Promise<{ ok: boolean; error?: string }> {
  await assertWriter();
  if (!id) return { ok: false, error: 'Falta el socio.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('socios')
    .update({ baja_el: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { ok: false, error: 'No se pudo dar de baja.' };

  revalidatePath('/admin/socios');
  return { ok: true };
}

/**
 * Le da el carnet a alguien a mano, sin pasar por Mercado Pago.
 *
 * Hace falta para los que pagan la cuota en efectivo o por transferencia, que
 * en una tienda de barrio son varios. Y para probar: no se puede pagar a la
 * propia cuenta de Mercado Pago, así que el dueño no puede darse de alta solo
 * por la web ni aunque quiera.
 *
 * Suma días igual que un pago: si ya era socio y está al día, se los agrega
 * al final; si estaba vencido, arranca de hoy.
 */
export async function altaManualSocio(input: {
  email: string;
  nombre: string;
  telefono: string;
  dias: number;
}): Promise<{ ok: boolean; error?: string; numero?: number; pagaHasta?: string }> {
  await assertWriter();

  const email = (input.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Revisá el mail.' };

  const secret = process.env.PUSH_SECRET;
  if (!secret) return { ok: false, error: 'Falta PUSH_SECRET en el servidor.' };

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc('socio_prealta', {
    p_email: email,
    p_nombre: (input.nombre || '').trim() || null,
    p_telefono: (input.telefono || '').trim() || null,
    // La cuota es la misma que la de la web: que la pague en efectivo no la
    // hace gratis, y con 0 el panel mostraría "$ 0 por mes" en el total.
    p_cuota: SOCIO.cuota,
  });
  if (error || !id) return { ok: false, error: 'No se pudo anotar.' };

  const { data, error: e2 } = await supabase.rpc('socio_pago_por_id', {
    p_secret: secret,
    p_id: id,
    // Sin id de pago: no viene de Mercado Pago. Por eso cada alta manual suma
    // sus días en vez de saltearse por repetida.
    p_pago_id: null,
    p_dias: Math.max(1, Math.min(365, Math.round(input.dias || SOCIO.dias))),
  });
  if (e2) return { ok: false, error: 'Se anotó pero no se pudo activar el carnet.' };

  const fila = Array.isArray(data) ? data[0] : null;

  // El mail de bienvenida sale igual que con un pago por la web: para el socio
  // no cambia nada, y es el mail que trae su número de carnet.
  if (fila?.nuevo && fila.email) {
    await sendEmail({
      to: fila.email,
      subject: `Ya sos socio — ${numeroDeSocio(fila.numero)}`,
      html: bienvenidaSocioHtml({
        nombre: fila.nombre ?? null,
        numero: fila.numero,
        fundador: Boolean(fila.fundador),
        percent: SOCIO.percent,
        pagaHasta: fila.paga_hasta,
      }),
    });
  }

  revalidatePath('/admin/socios');
  return { ok: true, numero: fila?.numero, pagaHasta: fila?.paga_hasta };
}
