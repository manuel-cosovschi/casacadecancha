'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter } from '@/lib/admin/actions-helpers';
import { currentUserId } from '@/lib/admin/auth';

type Result = { ok?: boolean; error?: string };

async function guard(): Promise<Result | null> {
  try {
    await assertWriter();
    return null;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export interface InternalOrderInput {
  providerId: string;
  product: string;
  size?: string | null;
  quantity: number;
  unitCost?: number | null;
  notes?: string | null;
}

/** Le pido camisetas a otro vendedor (para cubrir mis encargos). */
export async function createInternalOrder(input: InternalOrderInput): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const me = await currentUserId();
  if (!me) return { error: 'Sesión inválida.' };
  if (!input.providerId || input.providerId === me) return { error: 'Elegí a quién pedirle.' };
  const product = (input.product || '').trim();
  if (!product) return { error: 'Elegí o escribí el modelo.' };
  const quantity = Math.max(1, Math.trunc(Number(input.quantity) || 0));

  const supabase = await createClient();
  const { error } = await supabase.from('internal_orders').insert({
    requester_id: me,
    provider_id: input.providerId,
    product,
    size: (input.size || '').toString().trim() || null,
    quantity,
    unit_cost: Math.max(0, Number(input.unitCost) || 0),
    notes: (input.notes || '').toString().trim() || null,
    status: 'pendiente',
  });
  if (error) return { error: error.message };
  revalidatePath('/admin/encargos');
  return { ok: true };
}

/** Marca un pedido interno como entregado / pendiente. */
export async function setInternalOrderStatus(id: string, status: 'pendiente' | 'entregado'): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { error } = await supabase.from('internal_orders').update({ status }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/encargos');
  return { ok: true };
}

export async function deleteInternalOrder(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { error } = await supabase.from('internal_orders').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/encargos');
  return { ok: true };
}
