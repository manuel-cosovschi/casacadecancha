import { Suspense } from 'react';
import { PageHeader, StatCard } from '@/components/admin/ui';
import { RangeSelector } from '@/components/admin/RangeSelector';
import { DashboardCharts } from '@/components/admin/DashboardCharts';
import { getDashboardMetrics, type RangeKey } from '@/lib/admin/metrics';
import { formatPrice } from '@/lib/utils';

const VALID: RangeKey[] = ['today', 'yesterday', 'last7', 'last30', 'this_month', 'last_month'];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const rangeKey: RangeKey = VALID.includes(range as RangeKey) ? (range as RangeKey) : 'last30';
  const m = await getDashboardMetrics(rangeKey);

  return (
    <div>
      <PageHeader
        title="Resumen"
        description={`Período: ${m.label}`}
        action={
          <Suspense>
            <RangeSelector current={rangeKey} />
          </Suspense>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Facturación bruta" value={formatPrice(m.grossRevenue)} />
        <StatCard label="Ventas cobradas" value={formatPrice(m.collectedRevenue)} accent="green" />
        <StatCard label="Ventas pendientes" value={formatPrice(m.pendingRevenue)} accent="amber" />
        <StatCard label="Ganancia neta est." value={formatPrice(m.netProfit)} accent={m.netProfit >= 0 ? 'green' : 'red'} />
        <StatCard label="Pedidos" value={String(m.orders)} hint={`${m.paidOrders} pagados`} />
        <StatCard label="Pedidos pendientes" value={String(m.pendingOrders)} accent="amber" />
        <StatCard label="Pedidos entregados" value={String(m.deliveredOrders)} />
        <StatCard label="Cancelados" value={String(m.cancelledOrders)} accent="red" />
        <StatCard label="Ticket promedio" value={formatPrice(m.averageTicket)} />
        <StatCard label="Unidades vendidas" value={String(m.unitsSold)} />
        <StatCard label="Margen bruto" value={formatPrice(m.grossMargin)} />
        <StatCard label="Costo mercadería" value={formatPrice(m.cogs)} />
        <StatCard label="Inversión Ads" value={formatPrice(m.adSpend)} />
        <StatCard label="CPA" value={formatPrice(m.cpa)} hint="Costo por adquisición" />
        <StatCard label="ROAS" value={m.roas.toFixed(2)} hint="Retorno sobre Ads" />
        <StatCard label="MER" value={m.mer.toFixed(2)} hint="Eficiencia de marketing" />
        <StatCard label="Bajo stock" value={String(m.lowStockCount)} accent={m.lowStockCount > 0 ? 'amber' : 'navy'} />
        <StatCard label="Otros gastos" value={formatPrice(m.expensesTotal)} />
      </div>

      <DashboardCharts metrics={m} />

      {m.topProducts.length > 0 && (
        <div className="card mt-5 p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">
            Productos más vendidos
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-navy/50">
                  <th className="py-2">Producto</th>
                  <th className="py-2 text-right">Unidades</th>
                  <th className="py-2 text-right">Facturación</th>
                  <th className="py-2 text-right">Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {m.topProducts.map((p) => (
                  <tr key={p.name} className="border-t border-navy/5">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="py-2 text-right">{p.units}</td>
                    <td className="py-2 text-right">{formatPrice(p.revenue)}</td>
                    <td className="py-2 text-right text-green-600">{formatPrice(p.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
