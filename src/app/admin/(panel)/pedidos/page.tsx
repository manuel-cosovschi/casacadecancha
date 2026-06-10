import Link from 'next/link';
import { PageHeader, EmptyState, StatusBadge } from '@/components/admin/ui';
import { getAdminOrders } from '@/lib/admin/data';
import { ExportButton } from '@/components/admin/ExportButton';
import { formatPrice } from '@/lib/utils';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; status?: string }>;
}) {
  const { payment, status } = await searchParams;
  const orders = await getAdminOrders({ payment, status });

  const rows = orders.map((o: any) => ({
    pedido: o.order_number,
    fecha: new Date(o.created_at).toLocaleString('es-AR'),
    cliente: o.customer_name,
    whatsapp: o.customer_phone,
    provincia: o.province,
    total: o.total,
    medio_pago: o.payment_method,
    estado_pago: o.payment_status,
    estado_pedido: o.order_status,
    canal: o.channel,
  }));

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description={`${orders.length} pedidos`}
        action={
          <div className="flex gap-2">
            <ExportButton rows={rows} filename="pedidos" />
            <Link href="/admin/pedidos/nuevo" className="btn-primary">+ Pedido manual</Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        <FilterLink label="Todos" href="/admin/pedidos" active={!payment && !status} />
        <FilterLink label="Pago pendiente" href="/admin/pedidos?payment=pending_payment" active={payment === 'pending_payment'} />
        <FilterLink label="En revisión" href="/admin/pedidos?payment=payment_review" active={payment === 'payment_review'} />
        <FilterLink label="Pagados" href="/admin/pedidos?payment=paid" active={payment === 'paid'} />
        <FilterLink label="Nuevos" href="/admin/pedidos?status=new" active={status === 'new'} />
        <FilterLink label="Despachados" href="/admin/pedidos?status=shipped" active={status === 'shipped'} />
      </div>

      {orders.length === 0 ? (
        <EmptyState message="No hay pedidos en este filtro." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-navy/50">
                <th className="p-3">Pedido</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Total</th>
                <th className="p-3">Pago</th>
                <th className="p-3">Estado</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} className="border-b border-navy/5 hover:bg-navy/[0.02]">
                  <td className="p-3 font-semibold">#{o.order_number}</td>
                  <td className="p-3 text-navy/60">{new Date(o.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="p-3">
                    <p className="font-medium">{o.customer_name}</p>
                    <p className="text-xs text-navy/50">{o.province}</p>
                  </td>
                  <td className="p-3 font-medium">{formatPrice(o.total)}</td>
                  <td className="p-3"><StatusBadge status={o.payment_status} /></td>
                  <td className="p-3"><StatusBadge status={o.order_status} /></td>
                  <td className="p-3 text-right">
                    <Link href={`/admin/pedidos/${o.order_number}`} className="font-semibold text-navy hover:underline">
                      Ver
                    </Link>
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

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 font-semibold ${
        active ? 'bg-navy text-cream' : 'border border-navy/20 text-navy hover:bg-navy/5'
      }`}
    >
      {label}
    </Link>
  );
}
