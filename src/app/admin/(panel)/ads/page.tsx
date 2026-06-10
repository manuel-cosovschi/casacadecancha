import { PageHeader, EmptyState } from '@/components/admin/ui';
import { ConfirmAction } from '@/components/admin/ConfirmAction';
import { ExportButton } from '@/components/admin/ExportButton';
import { getAdMetrics } from '@/lib/admin/data';
import { saveAdMetric, deleteAdMetric } from '../_crud-actions';
import { formatPrice } from '@/lib/utils';

export default async function AdsPage() {
  const metrics = await getAdMetrics();
  const totalSpend = metrics.reduce((a: number, m: any) => a + Number(m.spend), 0);
  const totalRevenue = metrics.reduce((a: number, m: any) => a + Number(m.revenue), 0);
  const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

  return (
    <div>
      <PageHeader
        title="Meta Ads"
        description={`Inversión: ${formatPrice(totalSpend)} · Ingresos atribuidos: ${formatPrice(totalRevenue)} · ROAS: ${roas.toFixed(2)}`}
        action={<ExportButton rows={metrics.map((m: any) => ({ fecha: m.date, campana: m.campaign, inversion: m.spend, clics: m.clicks, compras: m.purchases, ingresos: m.revenue }))} filename="ads" />}
      />

      <form action={saveAdMetric} className="card mb-5 p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Cargar métricas (manual / CSV de Meta)</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <label className="text-xs"><span className="label">Fecha</span><input name="date" type="date" className="input" /></label>
          <label className="text-xs"><span className="label">Campaña</span><input name="campaign" className="input" /></label>
          <label className="text-xs"><span className="label">Conjunto</span><input name="adset" className="input" /></label>
          <label className="text-xs"><span className="label">Inversión</span><input name="spend" type="number" min="0" className="input" /></label>
          <label className="text-xs"><span className="label">Impresiones</span><input name="impressions" type="number" min="0" className="input" /></label>
          <label className="text-xs"><span className="label">Clics</span><input name="clicks" type="number" min="0" className="input" /></label>
          <label className="text-xs"><span className="label">Compras atrib.</span><input name="purchases" type="number" min="0" className="input" /></label>
          <label className="text-xs"><span className="label">Ingresos atrib.</span><input name="revenue" type="number" min="0" className="input" /></label>
        </div>
        <button type="submit" className="btn-primary mt-3">Guardar fila</button>
      </form>

      {metrics.length === 0 ? (
        <EmptyState message="No cargaste métricas de Ads todavía." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-navy/50">
                <th className="p-3">Fecha</th>
                <th className="p-3">Campaña</th>
                <th className="p-3 text-right">Inversión</th>
                <th className="p-3 text-right">Clics</th>
                <th className="p-3 text-right">CTR</th>
                <th className="p-3 text-right">Compras</th>
                <th className="p-3 text-right">Ingresos</th>
                <th className="p-3 text-right">ROAS</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m: any) => (
                <tr key={m.id} className="border-b border-navy/5">
                  <td className="p-3 text-navy/60">{m.date}</td>
                  <td className="p-3">{m.campaign || '—'}</td>
                  <td className="p-3 text-right">{formatPrice(m.spend)}</td>
                  <td className="p-3 text-right">{m.clicks}</td>
                  <td className="p-3 text-right">{m.ctr ? `${Number(m.ctr).toFixed(1)}%` : '—'}</td>
                  <td className="p-3 text-right">{m.purchases}</td>
                  <td className="p-3 text-right">{formatPrice(m.revenue)}</td>
                  <td className="p-3 text-right">{m.spend > 0 ? (m.revenue / m.spend).toFixed(2) : '—'}</td>
                  <td className="p-3 text-right">
                    <ConfirmAction action={deleteAdMetric.bind(null, m.id)} confirmText="¿Eliminar fila?" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
