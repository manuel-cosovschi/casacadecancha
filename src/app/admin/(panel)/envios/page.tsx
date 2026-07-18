import Link from 'next/link';
import { PageHeader, EmptyState } from '@/components/admin/ui';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/auth';
import { formatPrice, whatsappLink } from '@/lib/utils';
import { normalizeDeliveryStatus, DELIVERY_STEPS } from '@/lib/delivery';
import { DeliveryControl } from './DeliveryControl';

export const dynamic = 'force-dynamic';

export default async function EnviosPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, address, city, total, delivery_status, delivery_updated_at, created_at, shipping_method, order_status')
    .ilike('shipping_method', '%Mar del Plata%')
    .neq('order_status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(150);

  const list = (orders ?? []) as any[];
  const pendientes = list.filter((o) => normalizeDeliveryStatus(o.delivery_status) !== 'entregado');
  const entregados = list.filter((o) => normalizeDeliveryStatus(o.delivery_status) === 'entregado');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Envíos"
        description="Seguimiento de entregas en Mar del Plata. Actualizá el estado y el cliente lo ve en el link de su pedido."
      />

      {list.length === 0 ? (
        <EmptyState message="Todavía no hay pedidos con entrega en Mar del Plata." />
      ) : (
        <>
          <Section title={`En curso (${pendientes.length})`} orders={pendientes} />
          {entregados.length > 0 && (
            <Section title={`Entregados (${entregados.length})`} orders={entregados} muted />
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  orders,
  muted,
}: {
  title: string;
  orders: any[];
  muted?: boolean;
}) {
  if (orders.length === 0) return null;
  return (
    <div>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy/50">{title}</h2>
      <div className="space-y-3">
        {orders.map((o) => {
          const status = normalizeDeliveryStatus(o.delivery_status);
          const step = DELIVERY_STEPS.find((d) => d.key === status);
          const wsp = o.customer_phone
            ? whatsappLink(
                o.customer_phone,
                `Hola${o.customer_name ? ' ' + o.customer_name.split(' ')[0] : ''}, te escribo por tu pedido #${o.order_number} de Casaca de Cancha 🛵`,
              )
            : null;
          return (
            <div key={o.id} className={`card p-4 ${muted ? 'opacity-70' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/pedidos/${o.order_number}`} className="font-bold text-navy hover:underline">
                      #{o.order_number}
                    </Link>
                    <span className="badge border border-navy/15 text-navy/60">{step?.emoji} {step?.label}</span>
                  </div>
                  <p className="mt-1 text-sm text-navy/80">{o.customer_name || 'Sin nombre'}</p>
                  <p className="text-sm text-navy/55">{o.address || 'Sin dirección'}{o.city ? ` · ${o.city}` : ''}</p>
                  <p className="mt-1 text-xs text-navy/50">{formatPrice(o.total)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <DeliveryControl orderId={o.id} current={o.delivery_status} />
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
