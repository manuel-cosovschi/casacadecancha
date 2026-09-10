import { PageHeader, StatCard } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface DemandRow {
  equipo: string;
  anio: string | null;
  busquedas: number;
  sin_resultado: number;
  encargos: number;
  ultima: string;
  ejemplos: string[] | null;
}

/**
 * Qué busca la gente en el catálogo — y sobre todo, qué busca y no encuentra.
 *
 * Esa segunda lista es la que importa: es la demanda que se está perdiendo en
 * silencio, ordenada por cuántas veces alguien la buscó y se fue con las manos
 * vacías. Es la lista de qué conviene importar, con números atrás.
 */
export default async function DemandaPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase.rpc('catalog_demand', { p_days: 60 });
  const filas = (data ?? []) as DemandRow[];

  const total = filas.reduce((a, f) => a + Number(f.busquedas), 0);
  const perdidas = filas.reduce((a, f) => a + Number(f.sin_resultado), 0);
  const encargos = filas.reduce((a, f) => a + Number(f.encargos), 0);
  const sinStock = filas.filter((f) => Number(f.sin_resultado) > 0);

  return (
    <div>
      <PageHeader
        title="Demanda"
        description="Lo que la gente busca en el catálogo. Las búsquedas que no encontraron nada son la lista de qué conviene traer en el próximo pedido a proveedor."
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label="Búsquedas (60 días)" value={String(total)} />
        <StatCard
          label="Sin resultado"
          value={String(perdidas)}
          accent={perdidas > 0 ? 'amber' : undefined}
        />
        <StatCard label="Terminaron en encargo" value={String(encargos)} accent="green" />
      </div>

      {filas.length === 0 ? (
        <div className="rounded-2xl border border-navy/10 bg-white p-10 text-center">
          <p className="font-semibold text-navy">Todavía no hay búsquedas registradas.</p>
          <p className="mt-1 text-sm text-navy/60">
            En cuanto alguien use el buscador del catálogo, acá vas a ver qué busca y qué no
            encuentra.
          </p>
        </div>
      ) : (
        <>
          {sinStock.length > 0 && (
            <div className="mb-5 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">
                🎯 Lo más buscado que no tenés
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900/85">
                {sinStock.slice(0, 5).map((f) => (
                  <li key={`${f.equipo}-${f.anio ?? ''}`}>
                    <strong>
                      {f.equipo}
                      {f.anio ? ` ${f.anio}` : ''}
                    </strong>{' '}
                    — {f.sin_resultado}{' '}
                    {Number(f.sin_resultado) === 1 ? 'persona la buscó' : 'personas la buscaron'} y
                    no la encontraron
                    {Number(f.encargos) > 0 && `, ${f.encargos} la encargaron`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-navy/10 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-navy/10 bg-navy/[0.03] text-left">
                <tr className="text-xs uppercase tracking-wide text-navy/50">
                  <th className="px-4 py-3 font-bold">Equipo</th>
                  <th className="px-4 py-3 font-bold">Año</th>
                  <th className="px-4 py-3 text-right font-bold">Búsquedas</th>
                  <th className="px-4 py-3 text-right font-bold">Sin resultado</th>
                  <th className="px-4 py-3 text-right font-bold">Encargos</th>
                  <th className="px-4 py-3 font-bold">Cómo lo escribieron</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr
                    key={`${f.equipo}-${f.anio ?? ''}`}
                    className="border-b border-navy/5 last:border-0"
                  >
                    <td className="px-4 py-3 font-semibold text-navy">{f.equipo}</td>
                    <td className="px-4 py-3 text-navy/70">{f.anio || '—'}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{f.busquedas}</td>
                    <td
                      className={`px-4 py-3 text-right font-semibold tabular-nums ${
                        Number(f.sin_resultado) > 0 ? 'text-amber-600' : 'text-navy/30'
                      }`}
                    >
                      {f.sin_resultado}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-green-600">
                      {Number(f.encargos) > 0 ? f.encargos : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs italic text-navy/50">
                      {(f.ejemplos ?? []).join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
