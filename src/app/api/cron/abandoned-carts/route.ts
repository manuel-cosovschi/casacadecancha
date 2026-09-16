import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { getAllSettings } from '@/lib/settings';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/**
 * Cron: envía un recordatorio a quienes dejaron el carrito sin comprar.
 * Lo dispara Vercel Cron (ver vercel.json). Protegido con CRON_SECRET.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
  }

  const secret = process.env.PUSH_SECRET;
  if (!secret) return NextResponse.json({ ok: true, sent: 0 });

  const supabase = await createClient();
  // Carritos inactivos hace más de 60 minutos, no recordados ni convertidos.
  const { data: carts } = await supabase.rpc('get_pending_abandoned_carts', {
    p_secret: secret,
    p_minutes: 60,
  });

  // El descuento por transferencia estaba escrito a mano en el mail ("10% OFF")
  // y hoy está en 0%: a quien volvía por ese mail y pagaba por transferencia no
  // le aparecía ningún descuento. Prometer algo que el checkout no da, justo
  // cuando la persona está por comprar, es peor que no prometer nada. Ahora sale
  // del mismo lugar que lo aplica, y si está en cero no se menciona.
  const settings = await getAllSettings();
  const transferPct = settings.payments_transfer?.active
    ? Number(settings.payments_transfer.discount_percent) || 0
    : 0;
  const lineaTransferencia =
    transferPct > 0
      ? `<p style="color:#64748b;font-size:13px">Recordá: ${transferPct}% OFF pagando por transferencia.</p>`
      : '';

  let sent = 0;
  for (const c of (carts as any[]) || []) {
    const items = (c.items_json || [])
      .map((i: any) => `${i.quantity || 1}× ${i.name || ''}${i.size ? ` (${i.size})` : ''}`)
      .join(', ');
    const ok = await sendEmail({
      to: c.email,
      subject: 'Te quedó algo en el carrito 🛒',
      html: `<div style="font-family:system-ui,sans-serif;color:#0B1F3A">
        <h2>¿Lo dejamos pasar? 🇦🇷</h2>
        <p>Vimos que dejaste esto en tu carrito de Casaca de Cancha:</p>
        <p><strong>${items || 'tu pedido'}</strong></p>
        <p>Terminá tu compra en un toque:</p>
        <p><a href="${SITE_URL}/checkout" style="background:#0B1F3A;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Volver al checkout</a></p>
        ${lineaTransferencia}
      </div>`,
    });
    if (ok) sent++;
    await supabase.rpc('mark_cart_reminded', { p_secret: secret, p_id: c.id });
  }

  return NextResponse.json({ ok: true, sent });
}
