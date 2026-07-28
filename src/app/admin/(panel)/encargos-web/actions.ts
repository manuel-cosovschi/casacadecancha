'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter, logActivity } from '@/lib/admin/actions-helpers';

type Result = { ok?: boolean; error?: string };

async function guard(): Promise<Result | null> {
  try {
    await assertWriter();
    return null;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Aprueba un encargo: guarda la cotización y calcula la seña (50%). */
export async function approveEncargoRequest(
  id: string,
  quoteAmount: number,
): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const quote = Math.max(0, Math.round(Number(quoteAmount) || 0));
  if (quote <= 0) return { error: 'Ingresá el monto de la cotización.' };
  const deposit = Math.round(quote / 2);

  const supabase = await createClient();
  const { error } = await supabase
    .from('encargo_requests')
    .update({
      status: 'aprobado',
      quote_amount: quote,
      deposit_amount: deposit,
      reject_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };

  await logActivity('encargo_request_approved', 'encargo_request', id, { quote, deposit });
  revalidatePath('/admin/encargos-web');
  return { ok: true };
}

/** Rechaza un encargo con un motivo. */
export async function rejectEncargoRequest(id: string, reason: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const motivo = (reason || '').trim();
  if (motivo.length < 3) return { error: 'Escribí el motivo del rechazo.' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('encargo_requests')
    .update({
      status: 'rechazado',
      reject_reason: motivo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) return { error: error.message };

  await logActivity('encargo_request_rejected', 'encargo_request', id, { motivo });
  revalidatePath('/admin/encargos-web');
  return { ok: true };
}

/** Vuelve un encargo a "pendiente" (por si se aprobó/rechazó por error). */
export async function reopenEncargoRequest(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { error } = await supabase
    .from('encargo_requests')
    .update({ status: 'pendiente', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/encargos-web');
  return { ok: true };
}
