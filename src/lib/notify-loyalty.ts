import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { LOYALTY, statusFromOrders } from '@/lib/loyalty';
import { formatPrice } from '@/lib/utils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://casacadecancha.shop';
const BRAND = '#0B1F3A';

interface PaidOrder {
  customer_email?: string | null;
  customer_name?: string | null;
  subtotal?: number | string | null;
}

/**
 * Avisa al cliente que subió de nivel, cuando el pago del pedido se confirma.
 *
 * Se manda SOLO en el momento en que cruza un escalón (1ª, 2ª y 3ª compra que
 * califica). A partir de ahí ya está en el tope y repetirlo en cada compra
 * sería spam.
 *
 * Va acá y no en el checkout a propósito: el nivel se mide sobre compras
 * pagadas, así que cargar un pedido todavía no sube a nadie de nivel. Recién
 * cuando el pago se confirma la novedad es cierta.
 *
 * Best-effort: si falla, no rompe la confirmación del pedido.
 */
export async function notifyLoyaltyTier(
  supabase: SupabaseClient,
  order: PaidOrder,
): Promise<void> {
  try {
    if (!LOYALTY.active) return;

    const email = (order.customer_email || '').trim().toLowerCase();
    if (!email.includes('@')) return;

    // Si esta compra no superó el umbral, no movió el contador: nada que avisar.
    const subtotal = Number(order.subtotal) || 0;
    if (subtotal < LOYALTY.minOrderAmount) return;

    const { data, error } = await supabase.rpc('loyalty_percent_for_email', {
      p_email: email,
    });
    if (error || !data) return;

    const orders = Number((data as any).orders) || 0;
    const percent = Number((data as any).percent) || 0;
    if (percent <= 0) return;

    // Solo cuando cae justo en un escalón: ahí, y solo ahí, la novedad existe.
    const isTierJump = LOYALTY.tiers.some((t) => t.orders === orders);
    if (!isTierJump) return;

    const st = statusFromOrders(orders);
    const first = (order.customer_name || '').trim().split(/\s+/)[0] || '';

    await sendEmail({
      to: email,
      subject: `⭐ Subiste de nivel: ${percent}% OFF en tu próxima compra`,
      html: `<div style="font-family:system-ui,-apple-system,sans-serif;color:${BRAND};max-width:520px;margin:0 auto">
        <h1 style="font-size:22px;margin:0 0 6px">¡Gracias${first ? ` ${first}` : ''}!</h1>
        <p style="color:#444;line-height:1.6;margin:0 0 20px">
          Con esta ya son <strong>${orders} ${orders === 1 ? 'compra' : 'compras'}</strong>
          de más de ${formatPrice(LOYALTY.minOrderAmount)} en Casaca de Cancha.
          Eso te deja acá:
        </p>
        <div style="background:${BRAND};color:#fff;border-radius:16px;padding:24px;text-align:center">
          <p style="margin:0;font-size:11px;letter-spacing:2px;opacity:.75">TU DESCUENTO DE CLIENTE</p>
          <p style="margin:8px 0;font-size:40px;font-weight:800;line-height:1">${percent}% OFF</p>
          <p style="margin:0;font-size:14px">En tu próxima compra</p>
        </div>
        <p style="color:#444;line-height:1.6;margin:20px 0">
          <strong>No necesitás ningún código.</strong> Poné este mismo mail al finalizar
          la compra y el descuento se aplica solo.
        </p>
        ${
          st.toNext !== null && st.nextPercent !== null
            ? `<p style="color:#444;line-height:1.6;margin:0 0 20px">
                 Con ${st.toNext} ${st.toNext === 1 ? 'compra más' : 'compras más'} pasás
                 al <strong>${st.nextPercent}%</strong>.
               </p>`
            : `<p style="color:#444;line-height:1.6;margin:0 0 20px">
                 Llegaste al <strong>máximo del programa</strong>. De acá en más el
                 ${percent}% te acompaña en todas tus compras.
               </p>`
        }
        <p style="margin:0 0 22px">
          <a href="${SITE_URL}/camisetas"
             style="background:${BRAND};color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">
            Ver camisetas
          </a>
        </p>
        <p style="color:#888;font-size:12px;line-height:1.5;margin:0">
          Cuentan las compras pagadas de más de ${formatPrice(LOYALTY.minOrderAmount)}.
          El descuento no se suma a otras promociones: siempre se aplica el mejor.
        </p>
      </div>`,
    });
  } catch {
    /* best-effort: nunca romper la confirmación del pedido */
  }
}
