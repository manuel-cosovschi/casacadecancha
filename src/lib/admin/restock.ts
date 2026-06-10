import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Avisa por email a quienes pidieron "avisame cuando vuelva el stock" de una
 * variante que acaba de reponerse. Best-effort (no rompe el ajuste de stock).
 */
export async function notifyRestock(variantId: string): Promise<void> {
  try {
    const supabase = await createClient();

    const { data: variant } = await supabase
      .from('product_variants')
      .select('id, size, stock_physical, stock_reserved, product_id, products(name, slug)')
      .eq('id', variantId)
      .maybeSingle();
    if (!variant) return;
    const available = (variant.stock_physical || 0) - (variant.stock_reserved || 0);
    if (available <= 0) return;

    const product = Array.isArray(variant.products) ? variant.products[0] : (variant.products as any);
    const productName = product?.name || 'tu producto';
    const productUrl = `${SITE_URL}/producto/${product?.slug || ''}`;

    // Pendientes: de esta variante, o del producto sin talle, o mismo talle.
    const { data: notifs } = await supabase
      .from('stock_notifications')
      .select('id, email, size, variant_id')
      .eq('notified', false)
      .eq('product_id', variant.product_id);
    if (!notifs || notifs.length === 0) return;

    const targets = notifs.filter(
      (n: any) =>
        n.variant_id === variantId ||
        !n.variant_id ||
        (n.size && variant.size && n.size === variant.size),
    );
    if (targets.length === 0) return;

    for (const n of targets) {
      await sendEmail({
        to: n.email,
        subject: `¡Volvió el stock! ${productName}${variant.size ? ` (Talle ${variant.size})` : ''}`,
        html: `<div style="font-family:system-ui,sans-serif;color:#0B1F3A">
          <h2>¡Volvió el stock! 🇦🇷⚽️</h2>
          <p>La <strong>${productName}</strong>${variant.size ? ` en talle <strong>${variant.size}</strong>` : ''} ya está disponible de nuevo en Casaca de Cancha.</p>
          <p><a href="${productUrl}" style="background:#0B1F3A;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Ver producto</a></p>
          <p style="color:#64748b;font-size:13px">¡Apurate que vuelan!</p>
        </div>`,
      });
    }

    await supabase
      .from('stock_notifications')
      .update({ notified: true })
      .in('id', targets.map((t: any) => t.id));
  } catch {
    /* no-op */
  }
}
