import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPayment, isMercadoPagoProEnabled } from '@/lib/mercadopago';
import { sendOrderConfirmation } from '@/lib/notify-order';

/**
 * Webhook de Mercado Pago. Valida el pago contra la API de MP y confirma el
 * pedido vía RPC (marca pagado + descuenta stock). No requiere service role.
 */
export async function POST(request: Request) {
  if (!isMercadoPagoProEnabled()) {
    return NextResponse.json({ ok: true });
  }

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

  // Validamos el pago real contra Mercado Pago (con nuestro access token).
  const payment = await getPayment(paymentId);
  if (!payment || !payment.external_reference) {
    return NextResponse.json({ ok: true });
  }

  const secret = process.env.PUSH_SECRET;
  try {
    const supabase = await createClient();
    // Idempotencia: si el pedido ya estaba pagado, no reprocesar ni reenviar el aviso.
    const { data: existing } = await supabase.rpc('storefront_get_order', {
      p_order_number: payment.external_reference,
    });
    const already = existing?.payment_status === 'paid';
    await supabase.rpc('mp_confirm_payment', {
      p_order_number: payment.external_reference,
      p_payment_id: payment.id,
      p_status: payment.status,
      p_secret: secret,
    });
    // Confirmación automática al cliente solo si el pago quedó aprobado (y no estaba ya avisado).
    if (!already && payment.status === 'approved') {
      await sendOrderConfirmation(payment.external_reference);
    }
  } catch {
    /* no romper el webhook */
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
