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

export interface PushSub {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Envía un payload a una lista de suscripciones. Devuelve cuántas llegaron. */
export async function sendToSubscriptions(
  subs: PushSub[],
  payload: string,
): Promise<number> {
  if (!ensureVapid() || subs.length === 0) return 0;
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      ),
    ),
  );
  return results.filter((r) => r.status === 'fulfilled').length;
}

/** Push genérico a todos los administradores suscritos. */
export async function sendAdminPush(
  title: string,
  body: string,
  url = '/admin/encargos',
  tag = 'cdc-admin',
): Promise<void> {
  if (!ensureVapid()) return;
  const secret = process.env.PUSH_SECRET;
  if (!secret) return;
  try {
    const supabase = await createClient();
    const { data: subs } = await supabase.rpc('get_push_subscriptions', { p_secret: secret });
    if (!subs || subs.length === 0) return;
    await sendToSubscriptions(
      subs as PushSub[],
      JSON.stringify({ title, body, url, tag }),
    );
  } catch {
    /* no-op */
  }
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

    await sendToSubscriptions(subs as PushSub[], payload);
  } catch {
    /* no-op: el push no debe afectar el pedido */
  }
}
