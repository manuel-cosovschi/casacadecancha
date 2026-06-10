'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter, logActivity } from '@/lib/admin/actions-helpers';
import type { PaymentStatus, SalesChannel } from '@/lib/types';

interface ManualItem {
  product_name: string;
  size: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
}

interface ManualOrderInput {
  channel: SalesChannel;
  customer_name: string;
  customer_phone: string;
  province: string;
  payment_method: 'transfer' | 'mercadopago' | 'cash' | 'other';
  payment_status: PaymentStatus;
  shipping_cost: number;
  discount: number;
  notes: string;
  items: ManualItem[];
}

export async function createManualOrder(
  input: ManualOrderInput,
): Promise<{ ok?: boolean; error?: string; orderNumber?: string }> {
  try {
    await assertWriter();
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!input.items || input.items.length === 0) {
    return { error: 'Agregá al menos un producto.' };
  }

  const supabase = await createClient();
  const subtotal = input.items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const estimatedCost = input.items.reduce((acc, i) => acc + i.unit_cost * i.quantity, 0);
  const total = subtotal - (input.discount || 0) + (input.shipping_cost || 0);

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      subtotal,
      discount: input.discount || 0,
      shipping_cost: input.shipping_cost || 0,
      total,
      estimated_cost: estimatedCost,
      payment_method: input.payment_method,
      payment_status: input.payment_status,
      order_status: input.payment_status === 'paid' ? 'preparing' : 'new',
      channel: input.channel,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone || null,
      province: input.province || null,
      notes: input.notes || null,
    })
    .select('id, order_number')
    .single();

  if (error || !order) return { error: error?.message || 'No se pudo crear el pedido.' };

  await supabase.from('order_items').insert(
    input.items.map((i) => ({
      order_id: order.id,
      product_name: i.product_name,
      size: i.size || null,
      quantity: i.quantity,
      unit_price: i.unit_price,
      unit_cost: i.unit_cost,
      subtotal: i.unit_price * i.quantity,
    })),
  );

  await supabase.from('payments').insert({
    order_id: order.id,
    method: input.payment_method,
    amount: total,
    status: input.payment_status,
  });

  await logActivity('create_manual', 'order', order.id, { channel: input.channel });
  revalidatePath('/admin/pedidos');
  return { ok: true, orderNumber: order.order_number };
}
