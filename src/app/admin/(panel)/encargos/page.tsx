import { PageHeader, StatCard, EmptyState } from '@/components/admin/ui';
import { ExportButton } from '@/components/admin/ExportButton';
import { NewEncargoForm } from './NewEncargoForm';
import { EncargoCard } from './EncargoCard';
import { SupplierOrders } from './SupplierOrders';
import { getEncargos, getStockMatrix, getSupplierOrders } from '@/lib/admin/data';
import { formatPrice } from '@/lib/utils';

function totals(e: any) {
  const items: any[] = e.items ?? [];
  const total = items.reduce((a, i) => a + Number(i.sale_price) * i.quantity, 0);
  const cost = items.reduce((a, i) => a + Number(i.unit_cost) * i.quantity, 0);
  return { total, cost, margin: total - cost };
}

export default async function EncargosPage() {
  const [encargos, matrix, supplierOrders] = await Promise.all([
    getEncargos(),
    getStockMatrix(),
    getSupplierOrders(),
  ]);
  const activos = encargos.filter((e: any) => e.status !== 'cancelado');

  const sinCobrar = activos.filter((e: any) => !e.paid).length;
  const ganancia = activos.reduce((acc: number, e: any) => acc + totals(e).margin, 0);
  const aCobrar = activos.filter((e: any) => !e.paid).reduce((acc: number, e: any) => acc + totals(e).total, 0);

  // Unidades que faltan pedir y que sobran, según la matriz
  const porPedir = matrix.reduce((a, r) => a + Math.max(0, r.reserved - r.ordered), 0);
  const sobrante = matrix.reduce((a, r) => a + Math.max(0, r.ordered - r.reserved), 0);
  const matrixRows = matrix.filter((r) => r.reserved > 0 || r.ordered > 0);

  const rows = encargos.flatMap((e: any) =>
    (e.items ?? []).map((i: any) => ({
      cliente: e.customer_name,
      modelo: i.product,
      talle: i.size,
      reservado: i.quantity,
      pedido_proveedor: i.ordered_qty,
      precio_venta: i.sale_price,
      costo: i.unit_cost,
      pagado: e.paid ? 'sí' : 'no',
      estado: e.status,
    })),
  );

  return (
    <div>
      <PageHeader
        title="Encargos"
        description="Pedidos por fuera de la web. Controlá reservas vs. lo que pediste al proveedor."
        action={<ExportButton rows={rows} filename="encargos" />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Encargos activos" value={String(activos.length)} />
        <StatCard label="Unidades por pedir" value={String(porPedir)} accent={porPedir > 0 ? 'amber' : 'green'} hint="al proveedor" />
        <StatCard label="Stock sobrante" value={String(sobrante)} hint="pediste de más" />
        <StatCard label="Ganancia estimada" value={formatPrice(ganancia)} accent="green" hint={aCobrar > 0 ? `${formatPrice(aCobrar)} a cobrar` : undefined} />
      </div>

      {/* Pedidos al proveedor */}
      <div className="mb-5">
        <SupplierOrders orders={supplierOrders} />
      </div>

      {/* Stock por modelo y talle */}
      {matrixRows.length > 0 && (
        <div className="card mb-5 overflow-x-auto">
          <div className="border-b border-navy/10 px-4 py-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Stock por modelo y talle</h2>
            <p className="text-xs text-navy/50">Reservado por clientes vs. lo que pediste al proveedor.</p>
          </div>
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-navy/50">
                <th className="px-4 py-2">Modelo</th>
                <th className="px-4 py-2">Talle</th>
                <th className="px-4 py-2 text-center">Reservado</th>
                <th className="px-4 py-2 text-center">Pedido</th>
                <th className="px-4 py-2 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {matrixRows.map((r) => {
                const diff = r.ordered - r.reserved;
                return (
                  <tr key={r.key} className="border-t border-navy/5">
                    <td className="px-4 py-2 font-medium">{r.product}</td>
                    <td className="px-4 py-2">{r.size || '—'}</td>
                    <td className="px-4 py-2 text-center">{r.reserved}</td>
                    <td className="px-4 py-2 text-center">{r.ordered}</td>
                    <td className="px-4 py-2 text-center">
                      {diff < 0 ? (
                        <span className="badge bg-amber-100 text-amber-800">Faltan pedir {-diff}</span>
                      ) : diff > 0 ? (
                        <span className="badge bg-blue-100 text-blue-800">Sobran {diff}</span>
                      ) : (
                        <span className="badge bg-green-100 text-green-800">Justo</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-5">
        <NewEncargoForm matrix={matrix} />
      </div>

      {encargos.length === 0 ? (
        <EmptyState message="Todavía no cargaste encargos. Agregá el primero con el botón de arriba." />
      ) : (
        <div className="space-y-3">
          {encargos.map((e: any) => (
            <EncargoCard key={e.id} e={e} matrix={matrix} />
          ))}
        </div>
      )}
    </div>
  );
}
