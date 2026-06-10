'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter, logActivity } from '@/lib/admin/actions-helpers';
import type { OrderStatus, PaymentStatus } from '@/lib/types';

type Result = { ok?: boolean; error?: string };

/**
 * Descuenta stock definitivamente: pasa de reservado a físico real.
 * Se usa al confirmar pago o preparar el pedido.
 */
async function commitStock(orderId: string) {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from('order_items')
    .select('variant_id, quantity')
    .eq('order_id', orderId);
  for (const it of items ?? []) {
    if (!it.variant_id) continue;
    const { data: v } = await supabase
      .from('product_variants')
      .select('stock_physical, stock_reserved')
      .eq('id', it.variant_id)
      .maybeSingle();
    if (!v) continue;
    await supabase
      .from('product_variants')
      .update({
        stock_physical: Math.max(0, v.stock_physical - it.quantity),
        stock_reserved: Math.max(0, v.stock_reserved - it.quantity),
      })
      .eq('id', it.variant_id);
    await supabase.from('inventory_movements').insert({
      variant_id: it.variant_id,
      type: 'venta',
      quantity: it.quantity,
      reason: 'Venta confirmada',
      related_order_id: orderId,
    });
  }
}

/** Libera el stock reservado (cancelaciones). */
async function releaseStock(orderId: string) {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from('order_items')
    .select('variant_id, quantity')
    .eq('order_id', orderId);
  for (const it of items ?? []) {
    if (!it.variant_id) continue;
    const { data: v } = await supabase
      .from('product_variants')
      .select('stock_reserved')
      .eq('id', it.variant_id)
      .maybeSingle();
    if (!v) continue;
    await supabase
      .from('product_variants')
      .update({ stock_reserved: Math.max(0, v.stock_reserved - it.quantity) })
      .eq('id', it.variant_id);
    await supabase.from('inventory_movements').insert({
      variant_id: it.variant_id,
      type: 'liberacion',
      quantity: it.quantity,
      reason: 'Pedido cancelado',
      related_order_id: orderId,
    });
  }
}

export async function setPaymentStatus(
  orderId: string,
  orderNumber: string,
  status: PaymentStatus,
  reference?: string,
): Promise<Result> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();

  // Estado anterior para decidir movimientos de stock.
  const { data: prev } = await supabase
    .from('orders')
    .select('payment_status')
    .eq('id', orderId)
    .maybeSingle();

  const { error } = await supabase
    .from('orders')
    .update({ payment_status: status })
    .eq('id', orderId);
  if (error) return { error: error.message };

  await supabase
    .from('payments')
    .update({ status, payment_reference: reference || null })
    .eq('order_id', orderId);

  // Al marcar como pagado por primera vez, descontar stock.
  if (status === 'paid' && prev?.payment_status !== 'paid') {
    await commitStock(orderId);
  }
  // Si se cancela/rechaza un pedido aún no pagado, liberar reservas.
  if (
    (status === 'cancelled' || status === 'rejected') &&
    prev?.payment_status === 'pending_payment'
  ) {
    await releaseStock(orderId);
  }

  await logActivity('payment_status', 'order', orderId, { status });
  revalidatePath(`/admin/pedidos/${orderNumber}`);
  revalidatePath('/admin/pedidos');
  return { ok: true };
}

export async function setOrderStatus(
  orderId: string,
  orderNumber: string,
  status: OrderStatus,
): Promise<Result> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const { error } = await supabase.from('orders').update({ order_status: status }).eq('id', orderId);
  if (error) return { error: error.message };

  if (status === 'cancelled') await releaseStock(orderId);

  await logActivity('order_status', 'order', orderId, { status });
  revalidatePath(`/admin/pedidos/${orderNumber}`);
  revalidatePath('/admin/pedidos');
  return { ok: true };
}

export async function updateOrderFields(
  formData: FormData,
): Promise<Result> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  const supabase = await createClient();
  const orderId = formData.get('order_id')?.toString();
  const orderNumber = formData.get('order_number')?.toString() || '';
  if (!orderId) return { error: 'Pedido inválido.' };

  const payload: Record<string, unknown> = {
    tracking_code: formData.get('tracking_code')?.toString() || null,
    carrier: formData.get('carrier')?.toString() || null,
    shipping_cost: Number(formData.get('shipping_cost') || 0),
    internal_notes: formData.get('internal_notes')?.toString() || null,
  };
  const { error } = await supabase.from('orders').update(payload).eq('id', orderId);
  if (error) return { error: error.message };
  await logActivity('update', 'order', orderId, {});
  revalidatePath(`/admin/pedidos/${orderNumber}`);
  return { ok: true };
}
