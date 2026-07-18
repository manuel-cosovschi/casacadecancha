'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter, logActivity } from '@/lib/admin/actions-helpers';

type Result = { ok?: boolean; error?: string };

/** Marca uno o varios pedidos de stock como avisados. */
export async function markStockNotified(ids: string[], notified = true): Promise<Result> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!ids.length) return { ok: true };
  const supabase = await createClient();
  const { error } = await supabase.from('stock_notifications').update({ notified }).in('id', ids);
  if (error) return { error: error.message };
  await logActivity('stock_notified', 'stock_notification', ids[0], { count: ids.length, notified });
  revalidatePath('/admin/faltantes');
  return { ok: true };
}

/** Elimina un pedido de stock. */
export async function deleteStockRequest(id: string): Promise<Result> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('stock_notifications').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/faltantes');
  return { ok: true };
}
