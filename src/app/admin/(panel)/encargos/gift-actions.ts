'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter } from '@/lib/admin/actions-helpers';
import { adjustPhysicalStock } from '@/lib/admin/encargo-stock';

type Result = { ok?: boolean; error?: string };

async function guard(): Promise<Result | null> {
  try {
    await assertWriter();
    return null;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export interface GiftInput {
  product: string;
  size?: string | null;
  quantity: number;
  unitCost?: number | null;
  recipient?: string | null;
  reason?: string | null;
  variant_id?: string | null;
}

/** Registra un regalo/cortesía: descuenta stock y queda como pérdida (su costo) en rentabilidad. */
export async function createGift(input: GiftInput): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const product = (input.product || '').trim();
  if (!product) return { error: 'Elegí o escribí el modelo.' };
  const qty = Math.max(1, Math.trunc(Number(input.quantity) || 0));
  if (qty < 1) return { error: 'Ingresá una cantidad de 1 o más.' };

  const supabase = await createClient();
  const { error } = await supabase.from('gifts').insert({
    product,
    size: (input.size || '').toString().trim() || null,
    quantity: qty,
    unit_cost: Math.max(0, Number(input.unitCost) || 0),
    recipient: (input.recipient || '').toString().trim() || null,
    reason: (input.reason || '').toString().trim() || null,
    variant_id: input.variant_id || null,
  });
  if (error) return { error: error.message };

  if (input.variant_id) await adjustPhysicalStock(input.variant_id, -qty);
  revalidatePath('/admin/encargos');
  revalidatePath('/admin/rentabilidad');
  return { ok: true };
}

export async function deleteGift(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { data: prev } = await supabase
    .from('gifts')
    .select('quantity, variant_id')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('gifts').delete().eq('id', id);
  if (error) return { error: error.message };

  if (prev?.variant_id) await adjustPhysicalStock(prev.variant_id, prev.quantity || 0);
  revalidatePath('/admin/encargos');
  revalidatePath('/admin/rentabilidad');
  return { ok: true };
}
