'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter, logActivity } from '@/lib/admin/actions-helpers';
import { getCurrentProfile } from '@/lib/admin/auth';

type Result = { ok?: boolean; error?: string; code?: string };

async function guard(): Promise<Result | null> {
  try {
    await assertWriter();
    return null;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Código corto y fácil de leer (sin caracteres ambiguos). */
function newCode(): string {
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += ABC[Math.floor(Math.random() * ABC.length)];
  return out;
}

export interface CobroItemInput {
  name: string;
  size?: string | null;
  quantity: number;
  unit_price: number;
}

export interface CobroInput {
  concept: string;
  amount: number;
  items?: CobroItemInput[];
}

/** Crea un cobro y devuelve su código (el QR apunta a /cobrar/<código>). */
export async function createCobro(input: CobroInput): Promise<Result> {
  const g = await guard();
  if (g) return g;

  const amount = Math.max(0, Math.round(Number(input.amount) || 0));
  if (amount <= 0) return { error: 'Ingresá el monto a cobrar.' };
  const concept = (input.concept || '').trim() || 'Cobro';

  const supabase = await createClient();
  const profile = await getCurrentProfile();

  // Reintenta si el código ya existía (colisión muy poco probable).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const { error } = await supabase.from('payment_requests').insert({
      code,
      concept,
      amount,
      items: input.items ?? [],
      seller_id: profile?.id ?? null,
    });
    if (!error) {
      await logActivity('create', 'payment_request', code, { amount, concept });
      revalidatePath('/admin/cobros');
      return { ok: true, code };
    }
    if (!/duplicate|unique/i.test(error.message)) return { error: error.message };
  }
  return { error: 'No se pudo generar el código. Probá de nuevo.' };
}

/** Marca un cobro como cobrado / pendiente / cancelado. */
export async function setCobroStatus(
  id: string,
  status: 'pendiente' | 'cobrado' | 'cancelado',
): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { error } = await supabase
    .from('payment_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/cobros');
  return { ok: true };
}

/** Borra un cobro (por si se generó por error). */
export async function deleteCobro(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { error } = await supabase.from('payment_requests').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/cobros');
  return { ok: true };
}
