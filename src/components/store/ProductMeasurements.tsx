import type { ProductMeasurements as Data } from '@/lib/measurements';

/**
 * Tabla de medidas de la prenda concreta que se vende, no del talle teórico.
 * Es lo que más cambios por talle equivocado evita, así que va cerca del precio
 * y no escondida al pie.
 */
export function ProductMeasurements({ data }: { data: Data }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-bold">Medidas de esta camiseta</h2>
      <div className="overflow-x-auto rounded-2xl border border-navy/5 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-navy/10 text-xs font-bold uppercase tracking-wide text-navy/50">
              <th className="px-5 py-3">Talle</th>
              <th className="px-5 py-3">Ancho (cm)</th>
              <th className="px-5 py-3">Largo (cm)</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.size} className="border-b border-navy/5 last:border-0">
                <td className="px-5 py-3 font-bold text-navy">{r.size}</td>
                <td className="px-5 py-3 text-navy/75">{r.width}</td>
                <td className="px-5 py-3 text-navy/75">{r.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-navy/55">
        Medidas tomadas sobre la prenda apoyada: el <strong>ancho</strong> es de axila a
        axila y el <strong>largo</strong> va del hombro al ruedo. Puede haber una
        diferencia de 1 a 2 cm entre unidades.
        {data.note ? ` ${data.note}` : ''}
      </p>
    </section>
  );
}
