'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter } from '@/lib/admin/actions-helpers';

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
 * en una tienda de barrio son varios.
 */
export async function altaManualSocio(input: {
  email: string;
  nombre: string;
  telefono: string;
  dias: number;
}): Promise<{ ok: boolean; error?: string }> {
  await assertWriter();

  const email = (input.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Revisá el mail.' };

  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc('socio_prealta', {
    p_email: email,
    p_nombre: (input.nombre || '').trim() || null,
    p_telefono: (input.telefono || '').trim() || null,
    p_cuota: 0,
  });
  if (error || !id) return { ok: false, error: 'No se pudo anotar.' };

  const { error: e2 } = await supabase.rpc('socio_pago_por_id', {
    p_secret: process.env.PUSH_SECRET,
    p_id: id,
    // Sin id de pago: no viene de Mercado Pago. Cada alta manual suma sus días.
    p_pago_id: null,
    p_dias: Math.max(1, Math.min(365, Math.round(input.dias || 30))),
  });
  if (e2) return { ok: false, error: 'Se anotó pero no se pudo activar el carnet.' };

  revalidatePath('/admin/socios');
  return { ok: true };
}
