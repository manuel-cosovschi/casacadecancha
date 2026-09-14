import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
// Nunca se cachea: cada latido tiene que llegar a la base.
export const dynamic = 'force-dynamic';

/** Los únicos campos que se aceptan. Lo que venga de más se descarta. */
const CAMPOS = new Set([
  'sid',
  'kind',
  'path',
  'label',
  'value',
  'stage',
  'cart_items',
  'cart_value',
  'order_number',
  'device',
  'referrer',
  'utm',
]);

/**
 * Recibe los latidos del storefront.
 *
 * Es una ruta y no una server action porque `navigator.sendBeacon` necesita un
 * POST común: así el dato llega aunque la persona cierre la pestaña en ese
 * mismo instante, que es justo cuando interesa saber en qué página estaba.
 *
 * Siempre contesta 204, incluso si algo falla. Un error acá no es problema de
 * quien está comprando y no tiene por qué aparecerle en la consola.
 */
export async function POST(req: Request) {
  try {
    const crudo = await req.json();
    if (!crudo || typeof crudo !== 'object') return new NextResponse(null, { status: 204 });

    const p: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(crudo)) {
      if (CAMPOS.has(k) && v !== null && v !== undefined) p[k] = v;
    }
    if (!p.sid) return new NextResponse(null, { status: 204 });

    const supabase = await createClient();
    await supabase.rpc('track_hit', { p });
  } catch {
    /* no-op: el tracking nunca rompe la tienda */
  }
  return new NextResponse(null, { status: 204 });
}
