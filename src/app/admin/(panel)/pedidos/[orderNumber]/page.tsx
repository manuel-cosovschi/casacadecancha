import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader, StatusBadge } from '@/components/admin/ui';
import { OrderControls } from './OrderControls';
import { getAdminOrder } from '@/lib/admin/data';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, whatsappLink } from '@/lib/utils';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getAdminOrder(orderNumber);
  if (!order) notFound();

  // Comprobante de transferencia (URL firmada para verlo de forma segura).
  const proofPath = (order.payments ?? []).find((p: any) => p.proof_url)?.proof_url as
    | string
    | undefined;
  let proofUrl: string | null = null;
  if (proofPath) {
    const supabase = await createClient();
    const { data: signed } = await supabase.storage
      .from('comprobantes')
      .createSignedUrl(proofPath, 60 * 30);
    proofUrl = signed?.signedUrl ?? null;
  }

  const profit = (Number(order.total) || 0) - (Number(order.estimated_cost) || 0);
  const wspMsg = `Hola ${order.customer_name?.split(' ')[0] || ''}, te escribimos de Casaca de Cancha por tu pedido #${order.order_number}.`;

  return (
    <div>
      <PageHeader
        title={`Pedido #${order.order_number}`}
        description={new Date(order.created_at).toLocaleString('es-AR')}
        action={<Link href="/admin/pedidos" className="text-sm text-navy/60 hover:text-navy">← Volver</Link>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Items */}
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Productos</h2>
              <div className="flex gap-2">
                <StatusBadge status={order.payment_status} />
                <StatusBadge status={order.order_status} />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-navy/50">
                  <th className="py-1">Producto</th>
                  <th className="py-1">Talle</th>
                  <th className="py-1 text-center">Cant.</th>
                  <th className="py-1 text-right">Precio</th>
                  <th className="py-1 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(order.order_items ?? []).map((it: any) => (
                  <tr key={it.id} className="border-t border-navy/5">
                    <td className="py-2 font-medium">{it.product_name}</td>
                    <td className="py-2">{it.size}</td>
                    <td className="py-2 text-center">{it.quantity}</td>
                    <td className="py-2 text-right">{formatPrice(it.unit_price)}</td>
                    <td className="py-2 text-right font-medium">{formatPrice(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 space-y-1 border-t border-navy/10 pt-3 text-sm">
              <Row label="Subtotal" value={formatPrice(order.subtotal)} />
              {order.discount > 0 && <Row label="Descuento" value={`- ${formatPrice(order.discount)}`} />}
              {order.coupon_code && <Row label={`Cupón (${order.coupon_code})`} value={`- ${formatPrice(order.coupon_discount || 0)}`} muted />}
              <Row label="Envío" value={order.shipping_cost > 0 ? formatPrice(order.shipping_cost) : 'A coordinar'} />
              <Row label="Total" value={formatPrice(order.total)} bold />
              <Row label="Costo estimado" value={formatPrice(order.estimated_cost)} muted />
              <Row label="Ganancia estimada" value={formatPrice(profit)} accent />
            </div>
          </div>

          {/* Comprobante de transferencia */}
          {proofPath && (
            <div className="card border-celeste/40 p-5">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy/60">
                Comprobante de transferencia
              </h2>
              {order.payment_status === 'payment_review' && (
                <p className="mb-3 rounded-lg bg-amber-50 p-2 text-sm font-medium text-amber-800">
                  ⏳ El cliente subió el comprobante. Verificá que el dinero llegó y marcá el pago
                  como “Pagado”.
                </p>
              )}
              {proofUrl ? (
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn border-2 border-navy text-navy hover:bg-navy hover:text-cream"
                >
                  Ver comprobante ↗
                </a>
              ) : (
                <p className="text-sm text-navy/50">No se pudo generar el enlace del comprobante.</p>
              )}
            </div>
          )}

          <OrderControls order={order} />
        </div>

        {/* Cliente */}
        <aside className="space-y-5">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Cliente</h2>
            <dl className="space-y-2 text-sm">
              <Info label="Nombre" value={order.customer_name} />
              <Info label="WhatsApp" value={order.customer_phone} />
              <Info label="Email" value={order.customer_email} />
              <Info label="Provincia" value={order.province} />
              <Info label="Ciudad" value={order.city} />
              <Info label="Dirección" value={order.address} />
              <Info label="CP" value={order.postal_code} />
              <Info label="Envío" value={order.shipping_method} />
              <Info label="Canal" value={order.channel} />
            </dl>
            {order.customer_phone && (
              <a
                href={whatsappLink(order.customer_phone, wspMsg)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-wsp mt-4 w-full"
              >
                Abrir WhatsApp
              </a>
            )}
          </div>

          {(order.utm_source || order.fbclid || order.referrer) && (
            <div className="card p-5">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Atribución</h2>
              <dl className="space-y-2 text-sm">
                <Info label="Source" value={order.utm_source} />
                <Info label="Medium" value={order.utm_medium} />
                <Info label="Campaña" value={order.utm_campaign} />
                <Info label="Content" value={order.utm_content} />
                <Info label="fbclid" value={order.fbclid} />
                <Info label="Referrer" value={order.referrer} />
                <Info label="Landing" value={order.landing_page} />
                <Info label="Dispositivo" value={order.device} />
              </dl>
            </div>
          )}

          {order.notes && (
            <div className="card p-5">
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy/60">Nota del cliente</h2>
              <p className="text-sm text-navy/70">{order.notes}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, bold, muted, accent }: { label: string; value: string; bold?: boolean; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-navy/60">{label}</span>
      <span className={bold ? 'text-base font-bold' : accent ? 'font-semibold text-green-600' : muted ? 'text-navy/50' : 'font-medium'}>
        {value}
      </span>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-navy/50">{label}</dt>
      <dd className="text-right font-medium text-navy">{value}</dd>
    </div>
  );
}
