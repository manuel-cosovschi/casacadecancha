import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendAdminPush } from '@/lib/push';
import {
  recordatorioDePedido,
  resumen,
  type PedidoPendiente,
} from '@/lib/recordatorios';

/**
 * Cron: recordar los pedidos que hay que entregar.
 *
 * Todos los días busca lo que ya se aceptó o ya se cobró y todavía no salió de
 * la casa, y manda una notificación al celular por cada uno diciendo qué hay
 * que hacer: si es para entregar en Mar del Plata, si lo retiran, si hay que
 * despacharlo por Correo, y si ya está pago o falta cobrarlo.
 *
 * Si el pedido tiene una nota escrita en el panel, el texto lo escribe el
 * modelo leyéndola: ahí el recordatorio deja de ser "entregar el pedido" y pasa
 * a decir lo que esa nota cambia.
 *
 * Tres límites, por si algún día hay muchos pedidos:
 *
 *  - Máximo 4 notificaciones sueltas. De ahí para arriba va una sola que
 *    resume, porque diez notificaciones seguidas no son diez recordatorios:
 *    son una que molesta, y a la siguiente se silencian todas.
 *  - Se marca cuáles se avisaron, así el recordatorio es uno por día y no uno
 *    por cada vez que corra esto.
 *  - El modelo se llama solo para los pedidos que tienen nota.
 */

/** De ahí para arriba, en vez de una por pedido va una sola que resume. */
const MAX_SUELTAS = 4;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
  }

  const secret = process.env.PUSH_SECRET;
  if (!secret) return NextResponse.json({ ok: true, avisados: 0, motivo: 'sin PUSH_SECRET' });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('pedidos_por_entregar', {
    p_secret: secret,
    p_horas: 20,
  });

  if (error) {
    console.error('[cron:entregas] no se pudieron leer los pedidos:', error.message);
    return NextResponse.json({ error: 'No se pudieron leer los pedidos.' }, { status: 500 });
  }

  const pendientes = (data ?? []) as PedidoPendiente[];
  if (pendientes.length === 0) {
    return NextResponse.json({ ok: true, avisados: 0 });
  }

  let personalizados = 0;

  if (pendientes.length > MAX_SUELTAS) {
    const r = resumen(pendientes);
    await sendAdminPush(r.titulo, r.cuerpo, r.url, 'cdc-entregas');
  } else {
    // Uno por uno, con su propio `tag` para que el celular no los pise entre sí:
    // con el mismo tag, la última notificación reemplaza a la anterior y de
    // cuatro pedidos se ve uno solo.
    for (const p of pendientes) {
      const r = await recordatorioDePedido(p);
      if (r.personalizado) personalizados++;
      await sendAdminPush(r.titulo, r.cuerpo, r.url, `cdc-entrega-${p.order_number}`);
    }
  }

  // Recién acá, y no antes: si algo falla arriba, mañana se vuelve a intentar
  // en vez de quedar marcado como avisado sin que haya llegado nada.
  await supabase.rpc('marcar_entrega_avisada', {
    p_secret: secret,
    p_ids: pendientes.map((p) => p.id),
  });

  return NextResponse.json({
    ok: true,
    avisados: pendientes.length,
    personalizados,
    resumido: pendientes.length > MAX_SUELTAS,
  });
}
