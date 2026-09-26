import { NextResponse } from 'next/server';
import { responderGoat, MAX_PREGUNTA } from '@/lib/goat';
import type { Turno } from '@/lib/ai';

/**
 * El chat de Goat.
 *
 * Está abierto a cualquiera que entre a la página —esa es la idea— y cada
 * mensaje le cuesta plata a la tienda. Así que tiene freno: una misma IP puede
 * preguntar hasta `TOPE` veces por ventana, y de ahí en más Goat contesta que
 * está ocupado en vez de seguir gastando.
 *
 * El freno vive en memoria del proceso. No es perfecto —en Vercel hay varias
 * instancias y cada una lleva su cuenta, y se reinicia con cada deploy— pero
 * para el volumen de esta tienda alcanza, y no necesita ni base ni Redis.
 * Frena lo que hay que frenar: al que deja el dedo apretado.
 */

/** Cuántas preguntas por ventana. */
const TOPE = 25;
const VENTANA_MS = 10 * 60 * 1000;
/** Cuántas IPs distintas recordamos. Sin tope, la memoria crece sola. */
const MAX_IPS = 2000;

const visitas = new Map<string, { n: number; desde: number }>();

function seDebePasar(ip: string): boolean {
  const ahora = Date.now();
  const v = visitas.get(ip);

  if (!v || ahora - v.desde > VENTANA_MS) {
    // Se limpia acá y no con un temporizador: sin proceso de fondo, y el
    // trabajo se hace solo cuando hay tráfico.
    if (visitas.size > MAX_IPS) {
      for (const [k, x] of visitas) if (ahora - x.desde > VENTANA_MS) visitas.delete(k);
      if (visitas.size > MAX_IPS) visitas.clear();
    }
    visitas.set(ip, { n: 1, desde: ahora });
    return false;
  }

  v.n += 1;
  return v.n > TOPE;
}

function deQuienEs(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'desconocida';
}

export async function POST(request: Request) {
  const ip = deQuienEs(request);
  if (seDebePasar(ip)) {
    return NextResponse.json(
      {
        ok: false,
        texto:
          'Pará un poco que no doy abasto 😅 Probá de nuevo en un rato, o escribile al WhatsApp de la tienda y te atienden al toque.',
      },
      { status: 429 },
    );
  }

  let turnos: Turno[] = [];
  try {
    const body = await request.json();
    const crudos = Array.isArray(body?.turnos) ? body.turnos : [];
    // Se reconstruye turno por turno en vez de confiar en lo que llegó: el
    // navegador manda el historial y podría mandar cualquier cosa, incluso un
    // "turno de Goat" inventado para ponerle palabras en la boca.
    turnos = crudos
      .filter(
        (t: unknown): t is { quien: string; texto: string } =>
          typeof t === 'object' && t !== null && typeof (t as { texto?: unknown }).texto === 'string',
      )
      .map((t: { quien: string; texto: string }) => ({
        quien: t.quien === 'goat' ? ('goat' as const) : ('persona' as const),
        texto: String(t.texto).slice(0, MAX_PREGUNTA),
      }))
      .filter((t: Turno) => t.texto.trim().length > 0);
  } catch {
    turnos = [];
  }

  if (turnos.length === 0) {
    return NextResponse.json({ ok: false, texto: 'Escribime algo y te contesto.' }, { status: 400 });
  }
  // La charla siempre termina con algo que preguntó la persona. Si el último
  // turno es de Goat, el navegador mandó algo raro.
  if (turnos[turnos.length - 1].quien !== 'persona') {
    return NextResponse.json({ ok: false, texto: 'Escribime algo y te contesto.' }, { status: 400 });
  }

  const r = await responderGoat(turnos);
  return NextResponse.json(r);
}
