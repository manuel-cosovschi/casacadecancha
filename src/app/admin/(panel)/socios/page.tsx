import { PageHeader, EmptyState } from '@/components/admin/ui';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, whatsappLink } from '@/lib/utils';
import { SOCIO, numeroDeSocio, diasDeCarnet } from '@/lib/socios';
import { BajaSocioButton } from './BajaSocioButton';

export const dynamic = 'force-dynamic';

interface Socio {
  id: string;
  numero: number | null;
  email: string;
  nombre: string | null;
  telefono: string | null;
  fundador: boolean;
  cuota: number | string;
  desde: string | null;
  paga_hasta: string | null;
  baja_el: string | null;
}

function fecha(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

/** En qué anda cada carnet, dicho como lo diría una persona. */
function estado(s: Socio): { texto: string; clase: string } {
  if (s.baja_el) return { texto: 'Se dio de baja', clase: 'bg-navy/10 text-navy/60' };
  if (!s.paga_hasta) return { texto: 'Se anotó, no pagó', clase: 'bg-amber-100 text-amber-800' };
  const dias = diasDeCarnet(s.paga_hasta) ?? 0;
  if (dias < 0) return { texto: `Venció hace ${Math.abs(dias)}d`, clase: 'bg-red-100 text-red-800' };
  if (dias <= 3) return { texto: `Vence en ${dias}d`, clase: 'bg-amber-100 text-amber-800' };
  return { texto: `Al día · ${dias}d`, clase: 'bg-green-100 text-green-800' };
}

export default async function SociosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('socios')
    .select('*')
    .order('numero', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  const socios = (data ?? []) as Socio[];
  const activos = socios.filter((s) => !s.baja_el && s.paga_hasta && new Date(s.paga_hasta) > new Date());
  const porMes = activos.reduce((a, s) => a + Number(s.cuota || 0), 0);

  return (
    <div>
      <PageHeader
        title="Socios"
        description={
          socios.length === 0
            ? 'Todavía no hay nadie'
            : `${activos.length} al día · ${formatPrice(porMes)} por mes · ${socios.length} anotados en total`
        }
      />

      {socios.length === 0 ? (
        <EmptyState message={`Todavía no se anotó nadie a ${SOCIO.nombre}. La página está en /socio.`} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-navy/50">
                <th className="p-3">N°</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">Contacto</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Socio desde</th>
                <th className="p-3">Pagó hasta</th>
                <th className="p-3">Cuota</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {socios.map((s) => {
                const e = estado(s);
                return (
                  <tr key={s.id} className="border-b border-navy/5">
                    <td className="p-3 font-mono font-medium">
                      {s.numero ? numeroDeSocio(s.numero).replace('N° ', '') : '—'}
                      {s.fundador && (
                        <span className="ml-1.5 badge bg-celeste/30 text-navy">Fundador</span>
                      )}
                    </td>
                    <td className="p-3 font-medium">{s.nombre || '—'}</td>
                    <td className="p-3 text-navy/60">
                      <div>{s.email}</div>
                      {s.telefono && (
                        <a
                          href={whatsappLink(s.telefono, `Hola! Te escribimos de ${SOCIO.nombre}.`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-[#25D366] hover:underline"
                        >
                          {s.telefono}
                        </a>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`badge ${e.clase}`}>{e.texto}</span>
                    </td>
                    <td className="p-3 text-navy/60">{fecha(s.desde)}</td>
                    <td className="p-3 text-navy/60">{fecha(s.paga_hasta)}</td>
                    <td className="p-3">{formatPrice(Number(s.cuota || 0))}</td>
                    <td className="p-3 text-right">
                      {!s.baja_el && s.paga_hasta && <BajaSocioButton id={s.id} nombre={s.nombre || s.email} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-navy/50">
        El carnet se activa solo cuando entra la cuota por Mercado Pago, y el número de socio se
        asigna con el primer pago. Quien se anotó y no pagó todavía no tiene número ni beneficios.
      </p>
    </div>
  );
}
