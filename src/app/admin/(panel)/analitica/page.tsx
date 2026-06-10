import { Suspense } from 'react';
import { PageHeader } from '@/components/admin/ui';
import { RangeSelector } from '@/components/admin/RangeSelector';
import { DashboardCharts } from '@/components/admin/DashboardCharts';
import { getDashboardMetrics, type RangeKey } from '@/lib/admin/metrics';
import { formatPrice } from '@/lib/utils';

const VALID: RangeKey[] = ['today', 'yesterday', 'last7', 'last30', 'this_month', 'last_month'];

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range } = await searchParams;
  const key: RangeKey = VALID.includes(range as RangeKey) ? (range as RangeKey) : 'last30';
  const m = await getDashboardMetrics(key);

  return (
    <div>
      <PageHeader
        title="Analítica"
        description={`Período: ${m.label}`}
        action={<Suspense><RangeSelector current={key} /></Suspense>}
      />
      <DashboardCharts metrics={m} />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Ventas por provincia</h2>
          {m.byProvince.length === 0 ? (
            <p className="text-sm text-navy/40">Sin datos</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {m.byProvince.map((p) => (
                  <tr key={p.province} className="border-b border-navy/5">
                    <td className="py-2">{p.province}</td>
                    <td className="py-2 text-right font-medium">{formatPrice(p.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Pedidos por estado</h2>
          {m.byStatus.length === 0 ? (
            <p className="text-sm text-navy/40">Sin datos</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {m.byStatus.map((s) => (
                  <tr key={s.status} className="border-b border-navy/5">
                    <td className="py-2 capitalize">{s.status}</td>
                    <td className="py-2 text-right font-medium">{s.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
