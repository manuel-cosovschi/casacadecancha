'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter } from '@/lib/admin/actions-helpers';
import { getCurrentProfile, isOwnerRole } from '@/lib/admin/auth';
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

async function ownerCtx() {
  const p = await getCurrentProfile();
  return { sellerId: p?.id ?? null, isOwner: p ? isOwnerRole(p.role) : false };
}

export interface StockAdjustmentInput {
  product: string;
  size?: string | null;
  delta: number;
  reason?: string | null;
  variant_id?: string | null;
}

/** Crea un ajuste manual de stock por modelo+talle. Si está vinculado a una variante web, también corrige el stock de la tienda. */
export async function addStockAdjustment(input: StockAdjustmentInput): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const delta = Math.trunc(Number(input.delta) || 0);
  if (delta === 0) return { error: 'Ingresá una cantidad distinta de cero (+ o −).' };
  const product = (input.product || '').trim();
  if (!product) return { error: 'Elegí o escribí el modelo.' };

  const supabase = await createClient();
  const { sellerId, isOwner } = await ownerCtx();
  const variantId = isOwner ? input.variant_id || null : null;
  const { error } = await supabase.from('stock_adjustments').insert({
    product,
    size: (input.size || '').toString().trim() || null,
    delta,
    reason: (input.reason || '').toString().trim() || null,
    variant_id: variantId,
    seller_id: sellerId,
  });
  if (error) return { error: error.message };

  if (isOwner && variantId) await adjustPhysicalStock(variantId, delta);
  revalidatePath('/admin/encargos');
  return { ok: true };
}

/** Elimina un ajuste y revierte el efecto en el stock web si estaba vinculado. */
export async function deleteStockAdjustment(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { data: prev } = await supabase
    .from('stock_adjustments')
    .select('delta, variant_id')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('stock_adjustments').delete().eq('id', id);
  if (error) return { error: error.message };

  if (prev?.variant_id) await adjustPhysicalStock(prev.variant_id, -(prev.delta || 0));
  revalidatePath('/admin/encargos');
  return { ok: true };
}
