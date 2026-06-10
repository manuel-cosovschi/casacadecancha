import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile, canWrite } from '@/lib/admin/auth';
import { sendToSubscriptions, type PushSub } from '@/lib/push';

// Envía una notificación de prueba a las suscripciones del admin autenticado.
export async function POST() {
  const profile = await getCurrentProfile();
  if (!profile || !canWrite(profile.role)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const supabase = await createClient();
  // El admin autenticado puede leer las suscripciones (RLS staff).
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth');

  if (!subs || subs.length === 0) {
    return NextResponse.json(
      { error: 'No hay notificaciones activadas en este dispositivo todavía.' },
      { status: 400 },
    );
  }

  const payload = JSON.stringify({
    title: '🔔 Notificación de prueba',
    body: '¡Funciona! Así te vamos a avisar cuando entre un pedido. 🇦🇷⚽️',
    url: '/admin/pedidos',
    tag: 'cdc-test',
  });

  const sent = await sendToSubscriptions(subs as PushSub[], payload);
  if (sent === 0) {
    return NextResponse.json(
      { error: 'No se pudo enviar (revisá que las notificaciones estén permitidas).' },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, sent });
}
