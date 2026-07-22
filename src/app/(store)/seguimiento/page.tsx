import type { Metadata } from 'next';
import { TrackForm } from './TrackForm';
import { DeliveryTracker } from '@/components/store/DeliveryTracker';
import { trackOrder } from '@/lib/orders';

export const metadata: Metadata = {
  title: 'Seguí tu pedido',
  description: 'Ingresá tu código de seguimiento para ver el estado de tu envío.',
};

export const dynamic = 'force-dynamic';

export default async function SeguimientoPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const order = code ? await trackOrder(code) : null;
  const notFound = Boolean(code) && !order;

  return (
    <div className="container-page max-w-2xl py-12">
      <div className="card p-6">
        <h1 className="text-2xl font-extrabold uppercase">Seguí tu pedido</h1>
        <p className="mt-1 text-sm text-navy/60">
          Ingresá el código de seguimiento que te dimos al confirmar tu compra.
        </p>
        <div className="mt-4">
          <TrackForm initial={code || ''} />
        </div>

        {notFound && (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-700">
            No encontramos ningún pedido con ese código. Revisá que esté bien escrito
            (son 10 caracteres, empiezan con «CC»).
          </p>
        )}
      </div>

      {order && (
        <div className="card mt-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy/10 pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-navy/50">Código</p>
              <p className="font-mono text-lg font-bold text-navy">{order.tracking_ref}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-navy/50">Pedido</p>
              <p className="font-semibold text-navy">#{order.order_number}</p>
            </div>
          </div>

          <h2 className="mt-5 text-sm font-bold uppercase tracking-wide text-navy/60">
            Estado de tu envío
          </h2>
          <DeliveryTracker
            shippingMethod={order.shipping_method}
            deliveryStatus={order.delivery_status}
            carrier={order.carrier}
            trackingCode={order.tracking_code}
          />

          {order.delivery_updated_at && (
            <p className="mt-4 text-xs text-navy/50">
              Última actualización:{' '}
              {new Date(order.delivery_updated_at).toLocaleString('es-AR')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
