import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Cron: borra el detalle de tráfico viejo (más de 90 días).
 *
 * El panel "En vivo" guarda una fila por paso de cada visitante. Para ver qué
 * pasó hoy eso es justo lo que hace falta; a los tres meses es peso muerto.
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

  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc('purge_traffic');
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e).slice(0, 200) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
