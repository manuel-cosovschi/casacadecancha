import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile, canWrite } from '@/lib/admin/auth';

// Guarda la suscripción push del admin autenticado.
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !canWrite(profile.role)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  const sub = body?.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Suscripción incompleta.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint,
      p256dh,
      auth,
      user_id: profile.id,
      user_agent: body?.userAgent || null,
    },
    { onConflict: 'endpoint' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Baja de la suscripción
export async function DELETE(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile || !canWrite(profile.role)) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }
  const endpoint = body?.endpoint;
  if (!endpoint) return NextResponse.json({ error: 'Falta endpoint.' }, { status: 400 });
  const supabase = await createClient();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return NextResponse.json({ ok: true });
}
