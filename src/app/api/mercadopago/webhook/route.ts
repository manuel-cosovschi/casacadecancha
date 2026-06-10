import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPayment, isMercadoPagoProEnabled } from '@/lib/mercadopago';

/**
 * Webhook de Mercado Pago. Recibe notificaciones de pago, consulta el estado
 * real y confirma el pedido (marca pagado + descuenta stock) si fue aprobado.
 */
export async function POST(request: Request) {
  if (!isMercadoPagoProEnabled()) {
    return NextResponse.json({ ok: true });
  }

  // MP envía el id del pago de distintas formas según la versión.
  let paymentId: string | null = null;
  try {
    const url = new URL(request.url);
    paymentId = url.searchParams.get('data.id') || url.searchParams.get('id');
    if (!paymentId) {
      const body = await request.json().catch(() => null);
      if (body?.data?.id) paymentId = String(body.data.id);
      else if (body?.id && body?.type === 'payment') paymentId = String(body.id);
    }
  } catch {
    /* ignore */
  }

  if (!paymentId) return NextResponse.json({ ok: true });

  const payment = await getPayment(paymentId);
  if (!payment || !payment.external_reference) {
    return NextResponse.json({ ok: true });
  }

  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, payment_status, order_status')
    .eq('order_number', payment.external_reference)
    .maybeSingle();
  if (!order) return NextResponse.json({ ok: true });

  const mapStatus: Record<string, string> = {
    approved: 'paid',
    pending: 'payment_review',
    in_process: 'payment_review',
    rejected: 'rejected',
    cancelled: 'cancelled',
    refunded: 'refunded',
  };
  const newStatus = mapStatus[payment.status] || 'payment_review';

  await supabase
    .from('orders')
    .update({ payment_status: newStatus })
    .eq('id', order.id);
  await supabase
    .from('payments')
    .update({ status: newStatus, external_payment_id: payment.id })
    .eq('order_id', order.id);

  // Si se aprobó y no estaba pagado, descontar stock definitivamente.
  if (newStatus === 'paid' && order.payment_status !== 'paid') {
    const { data: items } = await supabase
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', order.id);
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
        reason: 'Pago confirmado por Mercado Pago',
        related_order_id: order.id,
      });
    }
    await supabase
      .from('orders')
      .update({ order_status: order.order_status === 'new' ? 'preparing' : order.order_status })
      .eq('id', order.id);
  }

  return NextResponse.json({ ok: true });
}

// MP a veces hace GET de verificación.
export async function GET() {
  return NextResponse.json({ ok: true });
}
