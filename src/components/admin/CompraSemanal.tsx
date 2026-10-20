import Link from 'next/link';
import type { SugerenciaCompra } from '@/lib/admin/compra-semanal';
import { marcarCompraSemanalVista } from '@/app/admin/(panel)/comprar/actions';

/** Cuántas filas entran en la tarjeta; el resto está en "Qué comprar". */
const MAX_FILAS = 8;

/** La sugerencia de compra de la semana, arriba de todo en el Resumen. */
export function CompraSemanal({ items }: { items: SugerenciaCompra[] }) {
  const unidades = items.reduce((a, r) => a + r.suggest, 0);
  const filas = items.slice(0, MAX_FILAS);

  return (
    <div className="card mb-5 border-2 border-amber-300 p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy">
            🛒 Sugerencia de compra de la semana
          </h2>
          <p className="text-xs text-navy/60">
            {items.length > 0
              ? `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'} en ${items.length} ${
                  items.length === 1 ? 'talle' : 'talles'
                } que se venden y están sin stock (o bajo). Según los últimos 90 días.`
              : 'Esta semana no hace falta reponer nada: lo que se vende tiene stock.'}
          </p>
        </div>
        <form action={marcarCompraSemanalVista}>
          <button type="submit" className="btn-celeste text-xs">
            Listo, la vi
          </button>
        </form>
      </div>

      {filas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="text-left text-navy/50">
                <th className="py-1.5">Producto</th>
                <th className="py-1.5">Talle</th>
                <th className="py-1.5 text-center">Vendidas</th>
                <th className="py-1.5 text-center">Stock</th>
                <th className="py-1.5 text-center">Comprar</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((r) => (
                <tr key={`${r.product}|${r.size}`} className="border-t border-navy/5">
                  <td className="py-1.5 font-medium">{r.product}</td>
                  <td className="py-1.5">{r.size || '—'}</td>
                  <td className="py-1.5 text-center">{r.sold}</td>
                  <td className="py-1.5 text-center text-navy/60">{r.stock}</td>
                  <td className="py-1.5 text-center">
                    <span className="badge bg-amber-100 text-amber-800">+{r.suggest}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-navy/50">
        <span>Vuelve a aparecer el lunes que viene.</span>
        <Link href="/admin/comprar" className="font-semibold text-navy underline">
          {items.length > MAX_FILAS ? `Ver las ${items.length} en Qué comprar →` : 'Ver detalle en Qué comprar →'}
        </Link>
      </div>
    </div>
  );
}
