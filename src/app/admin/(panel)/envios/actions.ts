'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter, logActivity } from '@/lib/admin/actions-helpers';
import type { DeliveryStatus } from '@/lib/delivery';

type Result = { ok?: boolean; error?: string };

/** Actualiza el estado del envío (seguimiento) de un pedido de Mar del Plata. */
export async function setDeliveryStatus(orderId: string, status: DeliveryStatus): Promise<Result> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!['preparando', 'en_camino', 'entregado'].includes(status)) {
    return { error: 'Estado inválido.' };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('orders')
    .update({ delivery_status: status, delivery_updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) return { error: error.message };
  await logActivity('delivery_status', 'order', orderId, { status });
  revalidatePath('/admin/envios');
  return { ok: true };
}
