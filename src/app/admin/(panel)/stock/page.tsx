import { PageHeader, EmptyState } from '@/components/admin/ui';
import { ExportButton } from '@/components/admin/ExportButton';
import { StockBot } from './StockBot';
import { getInventory, getIncomingStock } from '@/lib/admin/data';
import { adjustStock } from '../_crud-actions';
import { availableStock, formatPrice } from '@/lib/utils';

export default async function StockPage() {
  const [variants, incoming] = await Promise.all([getInventory(), getIncomingStock()]);
  const botRows = variants.map((v: any) => ({
    product: v.products?.name ?? 'Producto',
    size: v.size,
    available: availableStock(v),
  }));
  const lowStock = variants.filter((v: any) => availableStock(v) <= v.stock_minimum);
  const stockValue = variants.reduce(
    (acc: number, v: any) => acc + v.stock_physical * (v.variant_cost ?? 0),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Stock"
        description={`${variants.length} variantes · ${lowStock.length} con bajo stock · Stock valorizado: ${formatPrice(stockValue)}`}
        action={
          <ExportButton
            rows={variants.map((v: any) => ({
              producto: v.products?.name,
              talle: v.size,
              sku: v.sku,
              fisico: v.stock_physical,
              comprometido: (v.stock_reserved || 0) + (v.encargo_reserved || 0),
              disponible: availableStock(v),
              minimo: v.stock_minimum,
            }))}
            filename="stock"
          />
        }
      />

      <StockBot rows={botRows} incoming={incoming} />

      <p className="mb-3 mt-4 rounded-lg bg-celeste/10 p-3 text-xs text-navy/70">
        <strong>Cómo leer la tabla:</strong> <b>Físico</b> = todo lo que recibiste (incluye lo ya vendido/entregado).
        {' '}<b>Comprometido</b> = lo que ya está vendido o reservado en encargos.
        {' '}<b>Disponible</b> = lo que te queda para vender ahora (Físico − Comprometido).
      </p>

      {variants.length === 0 ? (
        <EmptyState message="No hay variantes cargadas. Creá productos con talles." cta={{ label: 'Ir a productos', href: '/admin/productos' }} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-navy/50">
                <th className="p-3">Producto</th>
                <th className="p-3">Talle</th>
                <th className="p-3">Físico</th>
                <th className="p-3">Comprometido</th>
                <th className="p-3">Disponible</th>
                <th className="p-3">Mín.</th>
                <th className="p-3">Ajustar</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v: any) => {
                const avail = availableStock(v);
                const low = avail <= v.stock_minimum;
                return (
                  <tr key={v.id} className={`border-b border-navy/5 ${low ? 'bg-amber-50' : ''}`}>
                    <td className="p-3 font-medium">{v.products?.name}</td>
                    <td className="p-3">{v.size}</td>
                    <td className="p-3 text-navy/60">{v.stock_physical}</td>
                    <td className="p-3 text-navy/60">
                      {(v.stock_reserved || 0) + (v.encargo_reserved || 0)}
                    </td>
                    <td className="p-3">
                      <span className={`font-bold ${low ? 'text-amber-700' : 'text-navy'}`}>{avail}</span>
                      {avail <= 0 && <span className="badge ml-1 bg-red-100 text-red-700">Sin stock</span>}
                    </td>
                    <td className="p-3 text-navy/50">{v.stock_minimum}</td>
                    <td className="p-3">
                      <form action={adjustStock} className="flex items-center gap-1">
                        <input type="hidden" name="variant_id" value={v.id} />
                        <input name="stock_physical" type="number" min="0" defaultValue={v.stock_physical} className="input !py-1 w-20" />
                        <button type="submit" className="text-xs font-semibold text-navy hover:underline">OK</button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
