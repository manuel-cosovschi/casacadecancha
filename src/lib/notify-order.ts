import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { sendWhatsAppText } from '@/lib/whatsapp';
import { formatPrice } from '@/lib/utils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://casacadecancha.shop';

/**
 * Envía al cliente la confirmación de pago con el detalle del pedido, el código
 * de seguimiento y el link. Best-effort: por email (Resend) y WhatsApp (Meta API,
 * si está configurada). No rompe el flujo si algún canal falla o no está activo.
 */
export async function sendOrderConfirmation(orderNumber: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: order } = await supabase.rpc('storefront_get_order', {
      p_order_number: orderNumber,
    });
    if (!order) return;

    const items = (order.order_items ?? []) as any[];
    const itemLines = items.map(
      (i) => `${i.quantity}x ${i.product_name}${i.size ? ` (${i.size})` : ''}`,
    );
    const firstName = order.customer_name ? String(order.customer_name).split(' ')[0] : '';
    const ref: string | null = order.tracking_ref || null;
    const trackingUrl = ref ? `${SITE_URL}/seguimiento?code=${ref}` : `${SITE_URL}/seguimiento`;

    // ---- Email ----
    if (order.customer_email) {
      const rows = items
        .map(
          (i) =>
            `<tr><td style="padding:4px 0">${i.quantity}× ${i.product_name}${
              i.size ? ` <span style="color:#64748b">(${i.size})</span>` : ''
            }</td><td style="padding:4px 0;text-align:right">${formatPrice(
              Number(i.subtotal) || Number(i.unit_price) * i.quantity,
            )}</td></tr>`,
        )
        .join('');
      const html = `
        <div style="font-family:system-ui,sans-serif;color:#0B1F3A;max-width:520px;margin:auto">
          <h2 style="color:#16a34a">✅ ¡Pago confirmado!</h2>
          <p>Hola${firstName ? ' ' + firstName : ''}, confirmamos el pago de tu pedido
             <strong>#${order.order_number}</strong> en Casaca de Cancha. ¡Gracias! ⚽</p>
          <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">
            ${rows}
            <tr><td style="border-top:1px solid #e2e8f0;padding-top:8px"><strong>Total</strong></td>
                <td style="border-top:1px solid #e2e8f0;padding-top:8px;text-align:right"><strong>${formatPrice(order.total)}</strong></td></tr>
          </table>
          ${
            ref
              ? `<div style="background:#eef6fb;border-radius:12px;padding:14px;margin-top:8px">
                   <p style="margin:0 0 6px">📦 Seguí el estado de tu envío:</p>
                   <p style="margin:0 0 8px"><strong style="font-size:18px;letter-spacing:1px">${ref}</strong></p>
                   <a href="${trackingUrl}" style="background:#0B1F3A;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">Ver seguimiento</a>
                 </div>`
              : ''
          }
          <p style="color:#64748b;font-size:12px;margin-top:16px">Casaca de Cancha · Vestí fútbol.</p>
        </div>`;
      await sendEmail({
        to: order.customer_email,
        subject: `✅ Pago confirmado — Pedido #${order.order_number}`,
        html,
      });
    }

    // ---- WhatsApp (si está configurada la API) ----
    if (order.customer_phone) {
      const msg =
        `¡Hola${firstName ? ' ' + firstName : ''}! ✅ Confirmamos el pago de tu pedido ` +
        `*#${order.order_number}* en Casaca de Cancha ⚽\n\n` +
        `${itemLines.map((l) => `• ${l}`).join('\n')}\n` +
        `Total: ${formatPrice(order.total)}\n` +
        (ref ? `\n📦 Seguí el estado de tu envío:\n${trackingUrl}\nCódigo: *${ref}*` : '');
      await sendWhatsAppText(order.customer_phone, msg);
    }
  } catch {
    /* best-effort: no romper el flujo de pago */
  }
}
