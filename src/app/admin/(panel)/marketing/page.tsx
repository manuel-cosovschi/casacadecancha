import { PageHeader, StatCard, EmptyState } from '@/components/admin/ui';
import { ExportButton } from '@/components/admin/ExportButton';
import { getStockNotifications, getAbandonedCarts } from '@/lib/admin/data';
import { formatPrice, whatsappLink } from '@/lib/utils';

export default async function MarketingPage() {
  const [stock, carts] = await Promise.all([
    getStockNotifications(),
    getAbandonedCarts(),
  ]);

  const pendingStock = stock.filter((s: any) => !s.notified);
  const openCarts = carts.filter((c: any) => !c.converted);

  return (
    <div className="space-y-6">
      <PageHeader title="Marketing" description="Demanda de stock y carritos abandonados." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Avisos de stock pendientes" value={String(pendingStock.length)} accent={pendingStock.length > 0 ? 'amber' : 'navy'} />
        <StatCard label="Personas esperando" value={String(new Set(pendingStock.map((s: any) => s.email)).size)} />
        <StatCard label="Carritos abandonados" value={String(openCarts.length)} accent={openCarts.length > 0 ? 'amber' : 'navy'} />
        <StatCard label="Recuperables" value={formatPrice(openCarts.reduce((a: number, c: any) => a + Number(c.subtotal), 0))} />
      </div>

      {/* Avisos de stock */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-navy">Avisos de stock (demanda)</h2>
          <ExportButton
            rows={stock.map((s: any) => ({ producto: s.products?.name, talle: s.size, email: s.email, telefono: s.phone, avisado: s.notified ? 'sí' : 'no', fecha: s.created_at }))}
            filename="avisos-stock"
          />
        </div>
        {stock.length === 0 ? (
          <EmptyState message="Todavía nadie pidió aviso de stock." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-navy/10 text-left text-navy/50">
                  <th className="p-3">Producto</th>
                  <th className="p-3">Talle</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s: any) => (
                  <tr key={s.id} className="border-b border-navy/5">
                    <td className="p-3 font-medium">{s.products?.name || '—'}</td>
                    <td className="p-3">{s.size || '—'}</td>
                    <td className="p-3 text-navy/70">{s.email}</td>
                    <td className="p-3">
                      {s.notified ? <span className="badge bg-green-100 text-green-800">Avisado</span> : <span className="badge bg-amber-100 text-amber-800">Esperando</span>}
                    </td>
                    <td className="p-3 text-navy/50">{new Date(s.created_at).toLocaleDateString('es-AR')}</td>
                    <td className="p-3 text-right">
                      {s.phone && (
                        <a href={whatsappLink(s.phone, `Hola! Ya tenemos stock${s.size ? ` del talle ${s.size}` : ''}. ¿Te interesa?`)} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#25D366] hover:underline">WhatsApp</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Carritos abandonados */}
      <div>
        <h2 className="mb-2 text-lg font-bold text-navy">Carritos abandonados</h2>
        {carts.length === 0 ? (
          <EmptyState message="Sin carritos abandonados por ahora." />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead>
                <tr className="border-b border-navy/10 text-left text-navy/50">
                  <th className="p-3">Email</th>
                  <th className="p-3">Productos</th>
                  <th className="p-3">Subtotal</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {carts.map((c: any) => (
                  <tr key={c.id} className="border-b border-navy/5">
                    <td className="p-3 text-navy/70">{c.email}</td>
                    <td className="p-3">{(c.items_json || []).map((i: any) => `${i.quantity || 1}× ${i.name || ''}`).join(', ') || '—'}</td>
                    <td className="p-3 font-medium">{formatPrice(c.subtotal)}</td>
                    <td className="p-3">
                      {c.converted ? <span className="badge bg-green-100 text-green-800">Compró</span> : c.reminded ? <span className="badge bg-blue-100 text-blue-800">Recordado</span> : <span className="badge bg-amber-100 text-amber-800">Abierto</span>}
                    </td>
                    <td className="p-3 text-navy/50">{new Date(c.updated_at).toLocaleDateString('es-AR')}</td>
                    <td className="p-3 text-right">
                      {c.phone && (
                        <a href={whatsappLink(c.phone, 'Hola! Vi que dejaste productos en el carrito. ¿Te ayudo a terminar la compra?')} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#25D366] hover:underline">WhatsApp</a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
