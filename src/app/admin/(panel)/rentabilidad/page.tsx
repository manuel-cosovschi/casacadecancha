import { Suspense } from 'react';
import { PageHeader, StatCard } from '@/components/admin/ui';
import { RangeSelector } from '@/components/admin/RangeSelector';
import { PriceCalculator } from '@/components/admin/PriceCalculator';
import { getDashboardMetrics, resolveRange, type RangeKey } from '@/lib/admin/metrics';
import { getEncargoFinancials } from '@/lib/admin/data';
import { formatPrice } from '@/lib/utils';

const VALID: RangeKey[] = ['today', 'yesterday', 'last7', 'last30', 'this_month', 'last_month'];

export default async function ProfitabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const key: RangeKey = VALID.includes(range as RangeKey) ? (range as RangeKey) : 'last30';
  const { from, to } = resolveRange(key);
  const [m, enc] = await Promise.all([
    getDashboardMetrics(key),
    getEncargoFinancials(from.toISOString(), to.toISOString()),
  ]);

  // Combinado: pedidos web/manuales + encargos (cobrados)
  const revenue = m.collectedRevenue + enc.paidRevenue;
  const cogs = m.cogs + enc.paidCost;
  const grossMargin = m.grossMargin + enc.paidMargin;
  const netProfit = grossMargin - m.adSpend - m.expensesTotal;
  const contributionMargin = grossMargin - m.expensesTotal;
  const marginPct = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const pendingRevenue = m.pendingRevenue + enc.pendingRevenue;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rentabilidad"
        description={`Período: ${m.label} · Incluye pedidos web y encargos`}
        action={<Suspense><RangeSelector current={key} /></Suspense>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Facturación (web + encargos)" value={formatPrice(revenue)} hint={`Web ${formatPrice(m.collectedRevenue)} · Encargos ${formatPrice(enc.paidRevenue)}`} />
        <StatCard label="Costo de mercadería" value={formatPrice(cogs)} />
        <StatCard label="Margen bruto" value={formatPrice(grossMargin)} accent="green" />
        <StatCard label="Ganancia neta estimada" value={formatPrice(netProfit)} accent={netProfit >= 0 ? 'green' : 'red'} />
        <StatCard label="Margen de contribución" value={formatPrice(contributionMargin)} />
        <StatCard label="Inversión publicitaria" value={formatPrice(m.adSpend)} />
        <StatCard label="Otros gastos" value={formatPrice(m.expensesTotal)} />
        <StatCard label="Margen %" value={`${marginPct.toFixed(1)}%`} />
        <StatCard label="Ganancia encargos" value={formatPrice(enc.paidMargin)} accent="green" hint={`${enc.paidCount} cobrados`} />
        <StatCard label="Pendiente de cobro" value={formatPrice(pendingRevenue)} accent="amber" hint={`Encargos: ${formatPrice(enc.pendingRevenue)}`} />
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
