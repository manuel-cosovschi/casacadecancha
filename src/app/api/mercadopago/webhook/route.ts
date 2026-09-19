import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPayment, isMercadoPagoProEnabled } from '@/lib/mercadopago';
import { sendOrderConfirmation } from '@/lib/notify-order';
import { sendAdminPush } from '@/lib/push';
import { sendEmail } from '@/lib/email';
import { SOCIO, numeroDeSocio } from '@/lib/socios';
import { bienvenidaSocioHtml } from '@/lib/avisos';

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

  // La cuota del carnet de socio no es un pedido de la tienda: no tiene número,
  // no descuenta stock y no lleva mail de confirmación de compra. Viene marcada
  // con el prefijo `SOCIO:` y se resuelve por su lado.
  if (payment.external_reference.startsWith('SOCIO:')) {
    const socioId = payment.external_reference.slice('SOCIO:'.length);
    if (payment.status === 'approved') {
      try {
        const supabase = await createClient();
        // La función es idempotente por `p_pago_id`: Mercado Pago repite el
        // aviso del mismo pago y sin eso una cuota valdría dos meses.
        const { data } = await supabase.rpc('socio_pago_por_id', {
          p_secret: secret,
          p_id: socioId,
          p_pago_id: payment.id,
          p_dias: SOCIO.dias,
        });
        const fila = Array.isArray(data) ? data[0] : null;
        // `nuevo` solo viene en true la primera vez: la bienvenida con el
        // número de socio se manda una sola vez, no en cada renovación.
        if (fila?.nuevo) {
          const { data: ficha } = await supabase
            .from('socios')
            .select('email, nombre')
            .eq('id', socioId)
            .maybeSingle();

          if (ficha?.email) {
            await sendEmail({
              to: ficha.email,
              subject: `Ya sos socio — ${numeroDeSocio(fila.numero)}`,
              html: bienvenidaSocioHtml({
                nombre: ficha.nombre ?? null,
                numero: fila.numero,
                fundador: Boolean(fila.fundador),
                percent: SOCIO.percent,
                pagaHasta: fila.paga_hasta,
              }),
            });
          }

          await sendAdminPush(
            `Socio nuevo ${numeroDeSocio(fila.numero)}`,
            `${ficha?.nombre || ficha?.email || 'Alguien'} se dio de alta en ${SOCIO.nombre}${fila.fundador ? ' como fundador' : ''}.`,
            '/admin/socios',
            `cdc-socio-${fila.numero}`,
          );
        }
      } catch {
        /* no romper el webhook */
      }
    }
    return NextResponse.json({ ok: true });
  }

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
