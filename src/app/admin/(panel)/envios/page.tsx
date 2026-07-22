import Link from 'next/link';
import { PageHeader, EmptyState } from '@/components/admin/ui';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/auth';
import { formatPrice, whatsappLink } from '@/lib/utils';
import { normalizeDeliveryStatus, deliverySteps, isMdpDelivery } from '@/lib/delivery';
import { isPickup } from '@/lib/shipping';
import { DeliveryControl } from './DeliveryControl';
import { CarrierForm } from './CarrierForm';

export const dynamic = 'force-dynamic';

export default async function EnviosPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, address, city, province, total, delivery_status, delivery_updated_at, created_at, shipping_method, order_status, carrier, tracking_code, tracking_ref')
    .eq('payment_status', 'paid')
    .neq('order_status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(200);

  // Los retiros en punto de retiro se coordinan por WhatsApp, no son envíos.
  const list = ((orders ?? []) as any[]).filter((o) => !isPickup(o.shipping_method));
  const mdp = list.filter((o) => isMdpDelivery(o.shipping_method));
  const nacional = list.filter((o) => !isMdpDelivery(o.shipping_method));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Envíos"
        description="Seguimiento de entregas. Actualizá el estado y el cliente lo ve con su código de seguimiento."
      />

      {list.length === 0 ? (
        <EmptyState message="Todavía no hay envíos de pedidos pagados." />
      ) : (
        <>
          <Section title="Mar del Plata" orders={mdp} nacional={false} />
          <Section title="Nacional (Correo)" orders={nacional} nacional />
        </>
      )}
    </div>
  );
}

function Section({
  title,
  orders,
  nacional,
}: {
  title: string;
  orders: any[];
  nacional: boolean;
}) {
  if (orders.length === 0) return null;
  const pendientes = orders.filter((o) => normalizeDeliveryStatus(o.delivery_status) !== 'entregado');
  const entregados = orders.filter((o) => normalizeDeliveryStatus(o.delivery_status) === 'entregado');
  return (
    <div>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy/50">
        {title} · {pendientes.length} en curso
      </h2>
      <div className="space-y-3">
        {[...pendientes, ...entregados].map((o) => {
          const status = normalizeDeliveryStatus(o.delivery_status);
          const step = deliverySteps(o.shipping_method).find((d) => d.key === status);
          const delivered = status === 'entregado';
          const wsp = o.customer_phone
            ? whatsappLink(
                o.customer_phone,
                `Hola${o.customer_name ? ' ' + o.customer_name.split(' ')[0] : ''}, te escribo por tu pedido #${o.order_number} de Casaca de Cancha 🛵`,
              )
            : null;
          return (
            <div key={o.id} className={`card p-4 ${delivered ? 'opacity-70' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/pedidos/${o.order_number}`} className="font-bold text-navy hover:underline">
                      #{o.order_number}
                    </Link>
                    <span className="badge border border-navy/15 text-navy/60">{step?.emoji} {step?.label}</span>
                    {o.tracking_ref && (
                      <span className="font-mono text-xs text-navy/50">{o.tracking_ref}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-navy/80">{o.customer_name || 'Sin nombre'}</p>
                  <p className="text-sm text-navy/55">
                    {o.address || 'Sin dirección'}
                    {o.city ? ` · ${o.city}` : ''}
                    {nacional && o.province ? ` · ${o.province}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-navy/50">{formatPrice(o.total)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <DeliveryControl orderId={o.id} current={o.delivery_status} nacional={nacional} />
                  <div className="flex gap-3 text-xs">
                    <Link href={`/pedido/${o.order_number}`} target="_blank" className="font-semibold text-celeste hover:underline">
                      Ver seguimiento ↗
                    </Link>
                    {wsp && (
                      <a href={wsp} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-600 hover:underline">
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
              {nacional && (
                <div className="mt-1 border-t border-navy/5 pt-2">
                  <CarrierForm orderId={o.id} carrier={o.carrier} trackingCode={o.tracking_code} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
