import { redirect } from 'next/navigation';
import { PageHeader, StatCard, EmptyState } from '@/components/admin/ui';
import { requireAdmin, isOwnerRole } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Rec {
  product: string;
  size: string;
  sold: number;
  revenue: number;
  margin: number;
  stock: number;
  suggest: number;
}

export default async function ComprarPage() {
  const me = await requireAdmin();
  if (!isOwnerRole(me.role)) redirect('/admin');
  const supabase = await createClient();
  const { data } = await supabase.rpc('purchase_recommendations', { p_days: 90 });
  const rows = ((data ?? []) as Rec[]).map((r) => ({
    ...r,
    revenue: Number(r.revenue),
    margin: Number(r.margin),
  }));

  const toBuy = rows.filter((r) => r.suggest > 0);
  const totalUnits = toBuy.reduce((a, r) => a + r.suggest, 0);
  const totalMargin = rows.reduce((a, r) => a + r.margin, 0);

  // Producto que más se vende (por unidades), sumando talles.
  const byProduct = new Map<string, { units: number; margin: number }>();
  for (const r of rows) {
    const p = byProduct.get(r.product) || { units: 0, margin: 0 };
    p.units += r.sold;
    p.margin += r.margin;
    byProduct.set(r.product, p);
  }
  const topProduct = [...byProduct.entries()].sort((a, b) => b[1].units - a[1].units)[0];

  return (
    <div>
      <PageHeader
        title="Qué comprar"
        description="Recomendaciones según lo que más se vende (últimos 90 días). Prioridad = ventas vs. stock actual."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Talles a reponer" value={String(toBuy.length)} accent={toBuy.length > 0 ? 'amber' : 'green'} />
        <StatCard label="Unidades a comprar" value={String(totalUnits)} hint="sugeridas" />
        <StatCard label="Más vendido" value={topProduct ? `${topProduct[1].units} u.` : '—'} hint={topProduct ? topProduct[0].split('—')[0].trim() : undefined} />
        <StatCard label="Ganancia 90 días" value={formatPrice(totalMargin)} accent="green" />
      </div>

      {rows.length === 0 ? (
        <EmptyState message="Todavía no hay ventas suficientes para recomendar compras. Cargá encargos o esperá pedidos web." />
      ) : (
        <>
          {toBuy.length > 0 && (
            <div className="card mb-5 overflow-x-auto">
              <div className="border-b border-navy/10 px-4 py-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">🛒 Comprá esto</h2>
                <p className="text-xs text-navy/50">Se venden y estás sin stock (o bajo). Cantidad sugerida para cubrir ~1,5 meses.</p>
              </div>
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="text-left text-navy/50">
                    <th className="px-4 py-2">Producto</th>
                    <th className="px-4 py-2">Talle</th>
                    <th className="px-4 py-2 text-center">Vendidas</th>
                    <th className="px-4 py-2 text-center">Stock</th>
                    <th className="px-4 py-2 text-center">Comprar</th>
                  </tr>
                </thead>
                <tbody>
                  {toBuy.map((r) => (
                    <tr key={`${r.product}|${r.size}`} className="border-t border-navy/5">
                      <td className="px-4 py-2 font-medium">{r.product}</td>
                      <td className="px-4 py-2">{r.size || '—'}</td>
                      <td className="px-4 py-2 text-center">{r.sold}</td>
                      <td className="px-4 py-2 text-center text-navy/60">{r.stock}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="badge bg-amber-100 text-amber-800">+{r.suggest}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="card overflow-x-auto">
            <div className="border-b border-navy/10 px-4 py-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Ranking de ventas (90 días)</h2>
              <p className="text-xs text-navy/50">Qué producto y talle se vende más. Los de arriba son tus prioridades.</p>
            </div>
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="text-left text-navy/50">
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2">Talle</th>
                  <th className="px-4 py-2 text-center">Vendidas</th>
                  <th className="px-4 py-2 text-right">Facturado</th>
                  <th className="px-4 py-2 text-right">Ganancia</th>
                  <th className="px-4 py-2 text-center">Stock</th>
                  <th className="px-4 py-2 text-center">Comprar</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.product}|${r.size}`} className="border-t border-navy/5">
                    <td className="px-4 py-2 font-medium">{r.product}</td>
                    <td className="px-4 py-2">{r.size || '—'}</td>
                    <td className="px-4 py-2 text-center font-semibold">{r.sold}</td>
                    <td className="px-4 py-2 text-right text-navy/70">{formatPrice(r.revenue)}</td>
                    <td className="px-4 py-2 text-right text-green-600">{formatPrice(r.margin)}</td>
                    <td className="px-4 py-2 text-center text-navy/60">{r.stock}</td>
                    <td className="px-4 py-2 text-center">
                      {r.suggest > 0 ? (
                        <span className="badge bg-amber-100 text-amber-800">+{r.suggest}</span>
                      ) : (
                        <span className="text-navy/30">—</span>
                      )}
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
