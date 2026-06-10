import 'server-only';
import webpush from 'web-push';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils';

let configured = false;

function ensureVapid(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:cosovschim@gmail.com',
      pub,
      priv,
    );
    configured = true;
  }
  return true;
}

/**
 * Envía una notificación push a todos los administradores suscritos
 * cuando entra un pedido nuevo. Best-effort (no rompe el checkout).
 */
export async function sendOrderPush(
  orderNumber: string,
  total: number,
  channel = 'web',
): Promise<void> {
  if (!ensureVapid()) return;
  const secret = process.env.PUSH_SECRET;
  if (!secret) return;

  try {
    const supabase = await createClient();
    const { data: subs } = await supabase.rpc('get_push_subscriptions', { p_secret: secret });
    if (!subs || subs.length === 0) return;

    const payload = JSON.stringify({
      title: `🛒 Nuevo pedido #${orderNumber}`,
      body: `${formatPrice(total)}${channel !== 'web' ? ` · ${channel}` : ''} — tocá para verlo`,
      url: `/admin/pedidos/${orderNumber}`,
      tag: `order-${orderNumber}`,
    });

    await Promise.allSettled(
      (subs as any[]).map((s) =>
        webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        ),
      ),
    );
  } catch {
    /* no-op: el push no debe afectar el pedido */
  }
}
