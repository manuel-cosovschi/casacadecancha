import { Suspense } from 'react';
import { PageHeader, StatCard } from '@/components/admin/ui';
import { RangeSelector } from '@/components/admin/RangeSelector';
import { PriceCalculator } from '@/components/admin/PriceCalculator';
import { getDashboardMetrics, type RangeKey } from '@/lib/admin/metrics';
import { formatPrice } from '@/lib/utils';

const VALID: RangeKey[] = ['today', 'yesterday', 'last7', 'last30', 'this_month', 'last_month'];

export default async function ProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const key: RangeKey = VALID.includes(range as RangeKey) ? (range as RangeKey) : 'last30';
  const m = await getDashboardMetrics(key);

  const contributionMargin = m.grossMargin - m.expensesTotal;
  const marginPct = m.collectedRevenue > 0 ? (m.netProfit / m.collectedRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rentabilidad"
        description={`Período: ${m.label}`}
        action={<Suspense><RangeSelector current={key} /></Suspense>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Facturación neta" value={formatPrice(m.collectedRevenue)} />
        <StatCard label="Costo de mercadería" value={formatPrice(m.cogs)} />
        <StatCard label="Margen bruto" value={formatPrice(m.grossMargin)} accent="green" />
        <StatCard label="Margen de contribución" value={formatPrice(contributionMargin)} />
        <StatCard label="Inversión publicitaria" value={formatPrice(m.adSpend)} />
        <StatCard label="Otros gastos" value={formatPrice(m.expensesTotal)} />
        <StatCard label="Ganancia neta estimada" value={formatPrice(m.netProfit)} accent={m.netProfit >= 0 ? 'green' : 'red'} />
        <StatCard label="Margen %" value={`${marginPct.toFixed(1)}%`} />
        <StatCard label="CPA actual" value={formatPrice(m.cpa)} />
        <StatCard label="ROAS" value={m.roas.toFixed(2)} />
        <StatCard label="MER" value={m.mer.toFixed(2)} />
        <StatCard label="Ticket promedio" value={formatPrice(m.averageTicket)} />
      </div>

      {m.topProducts.length > 0 && (
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">Ganancia por producto</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-navy/50">
                  <th className="py-2">Producto</th>
                  <th className="py-2 text-right">Unidades</th>
                  <th className="py-2 text-right">Facturación</th>
                  <th className="py-2 text-right">Ganancia</th>
                  <th className="py-2 text-right">Margen %</th>
                </tr>
              </thead>
              <tbody>
                {m.topProducts.map((p) => (
                  <tr key={p.name} className="border-t border-navy/5">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="py-2 text-right">{p.units}</td>
                    <td className="py-2 text-right">{formatPrice(p.revenue)}</td>
                    <td className="py-2 text-right text-green-600">{formatPrice(p.profit)}</td>
                    <td className="py-2 text-right">{p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(0) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PriceCalculator />
    </div>
  );
}
