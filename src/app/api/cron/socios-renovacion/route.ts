import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { renovacionSocioHtml } from '@/lib/avisos';
import { SOCIO } from '@/lib/socios';

/**
 * Cron: avisarle al socio que se le vence el carnet.
 *
 * El cobro no es automático —cada cuota se paga a mano por Mercado Pago—, así
 * que sin este aviso el carnet se vence en silencio: la persona pierde los
 * beneficios sin enterarse, entra al checkout, ve el precio de siempre y se
 * siente estafada. Eso cuesta más caro que el socio que se va.
 *
 * Entra el que vence dentro de tres días y el que venció hace menos de tres.
 * Más viejo que eso ya no es un recordatorio, es insistir.
 *
 * Se avisa UNA vez por período: `socios_marcar_avisados` lo deja asentado, y la
 * marca se limpia sola cuando paga la cuota siguiente.
 */

/** Cuántos días antes se avisa. */
const DIAS_ANTES = 3;

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
  const { data, error } = await supabase.rpc('socios_por_vencer', {
    p_secret: secret,
    p_dias: DIAS_ANTES,
  });

  if (error) {
    console.error('[cron:socios] no se pudo leer:', error.message);
    return NextResponse.json({ error: 'No se pudieron leer los socios.' }, { status: 500 });
  }

  const socios = (data ?? []) as {
    id: string;
    numero: number | null;
    email: string;
    nombre: string | null;
    paga_hasta: string;
    dias_restantes: number;
  }[];

  if (socios.length === 0) return NextResponse.json({ ok: true, avisados: 0 });

  const avisados: string[] = [];
  for (const s of socios) {
    const res = await sendEmail({
      to: s.email,
      subject:
        s.dias_restantes < 0 ? 'Se te venció el carnet de socio' : 'Se te vence el carnet de socio',
      html: renovacionSocioHtml({
        nombre: s.nombre,
        numero: s.numero,
        percent: SOCIO.percent,
        pagaHasta: s.paga_hasta,
        diasRestantes: s.dias_restantes,
      }),
    });
    // Solo se marca el que realmente salió: si el mail falló, mañana se
    // reintenta en vez de quedar asentado como avisado sin haber avisado.
    if (res) avisados.push(s.id);
  }

  if (avisados.length > 0) {
    await supabase.rpc('socios_marcar_avisados', { p_secret: secret, p_ids: avisados });
  }

  return NextResponse.json({ ok: true, avisados: avisados.length, encontrados: socios.length });
}
