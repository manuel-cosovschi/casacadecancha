import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CopyButton } from './CopyButton';
import { MercadoPagoButton } from './MercadoPagoButton';
import { TransferProofUpload } from './TransferProofUpload';
import { getOrderByNumber } from '@/lib/orders';
import { getAllSettings } from '@/lib/settings';
import { isMercadoPagoProEnabled } from '@/lib/mercadopago';
import { formatPrice, whatsappLink } from '@/lib/utils';
import { DeliveryTracker } from '@/components/store/DeliveryTracker';
import { isPickup } from '@/lib/shipping';

export const metadata: Metadata = {
  title: 'Pedido registrado',
  robots: { index: false },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ method?: string; status?: string }>;
}) {
  const { orderNumber } = await params;
  const { method, status } = await searchParams;
  const [order, settings] = await Promise.all([
    getOrderByNumber(orderNumber),
    getAllSettings(),
  ]);
  if (!order) notFound();

  const payMethod = method || order.payment_method;
  const transfer = settings.payments_transfer;
  const mp = settings.payments_mercadopago;
  const whatsappNumber = transfer?.whatsapp || settings.whatsapp?.number || '';
  const isRetiro = method === 'retiro' || isPickup(order.shipping_method);

  const comprobanteMsg = `Hola, realicé el pedido #${order.order_number}.\nElegí pagar por ${
    payMethod === 'transfer' ? 'transferencia' : 'Mercado Pago'
  }.\nAdjunto comprobante.`;

  // Mensaje de WhatsApp para retiro: pedido armado con el detalle para coordinar la seña.
  const retiroItems: any[] = (order as any).order_items ?? [];
  const retiroLines = retiroItems
    .map((i) => `• ${i.quantity}x ${i.product_name}${i.size ? ` (${i.size})` : ''}`)
    .join('\n');
  const retiroMsg =
    `Hola! Hice el pedido #${order.order_number} para RETIRAR en la zona de Av. Constitución.\n\n` +
    (retiroLines ? `${retiroLines}\n\n` : '') +
    `Total: ${formatPrice(order.total)}\n\nQuiero coordinar la seña y el retiro. 🤝`;

  return (
    <div className="container-page max-w-2xl py-12">
      <div className="card p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold uppercase">¡Pedido registrado!</h1>
        <p className="mt-1 text-navy/70">
          Tu número de pedido es{' '}
          <strong className="text-navy">#{order.order_number}</strong>
        </p>
        <p className="mt-3 text-lg font-bold">Total: {formatPrice(order.total)}</p>
        {status === 'success' && (
          <p className="mt-3 rounded-lg bg-green-50 p-2 text-sm font-medium text-green-700">
            Recibimos tu pago. Lo estamos confirmando y te avisamos por WhatsApp.
          </p>
        )}
        {status === 'pending' && (
          <p className="mt-3 rounded-lg bg-amber-50 p-2 text-sm font-medium text-amber-700">
            Tu pago quedó pendiente de acreditación. Te avisamos en cuanto se confirme.
          </p>
        )}
      </div>

      {/* Envío */}
      {order.shipping_method && (
        <div className="card mt-6 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Entrega</h2>
          <p className="mt-1 text-sm text-navy/80">{order.shipping_method}</p>
          {isRetiro ? (
            <p className="mt-2 rounded-lg bg-celeste/15 p-2 text-sm text-navy">
              🤝 El retiro es en la <strong>zona de Av. Constitución (Mar del Plata)</strong>.
              Coordinamos el punto exacto y la <strong>seña</strong> por WhatsApp. El resto lo pagás
              cuando lo retirás.
            </p>
          ) : /(resto del país|correo|nacional)/i.test(order.shipping_method) ? (
            <p className="mt-2 rounded-lg bg-celeste/15 p-2 text-sm text-navy">
              📦 Enviamos por <strong>Correo Argentino</strong> a todo el país. El envío ya está
              incluido en el total.
            </p>
          ) : (
            <p className="mt-2 rounded-lg bg-celeste/15 p-2 text-sm text-navy">
              🛵 Entrega en Mar del Plata. Podés seguir el estado de tu envío en esta misma página.
            </p>
          )}
        </div>
      )}

      {/* Seguimiento de envío: disponible una vez confirmado el pago (tiene código) */}
      {!isRetiro && (order.tracking_ref ? (
        <div className="card mt-6 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-navy/10 pb-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
                Seguimiento de tu envío
              </h2>
              <p className="mt-1 text-xs text-navy/50">
                Código:{' '}
                <span className="font-mono text-sm font-bold text-navy">{order.tracking_ref}</span>
              </p>
            </div>
            <Link
              href={`/seguimiento?code=${order.tracking_ref}`}
              className="rounded-lg border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy hover:text-cream"
            >
              Ver seguimiento →
            </Link>
          </div>
          <DeliveryTracker
            shippingMethod={order.shipping_method}
            deliveryStatus={order.delivery_status}
            carrier={order.carrier}
            trackingCode={order.tracking_code}
          />
          <p className="mt-4 text-xs text-navy/50">
            Guardá tu código para seguir el estado desde{' '}
            <Link href="/seguimiento" className="font-semibold underline-offset-2 hover:underline">
              casacadecancha.shop/seguimiento
            </Link>
            . Lo actualizamos a medida que avanza tu envío.
          </p>
        </div>
      ) : (
        <div className="card mt-6 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
            Seguimiento de tu envío
          </h2>
          <p className="mt-2 text-sm text-navy/60">
            Apenas confirmemos tu pago vas a recibir un <strong>código de seguimiento</strong> para
            ver el estado de tu envío en esta página y en{' '}
            <Link href="/seguimiento" className="font-semibold underline-offset-2 hover:underline">
              nuestra página de seguimiento
            </Link>
            .
          </p>
        </div>
      ))}

      {/* Instrucciones según método */}
      {isRetiro ? (
        <div className="card mt-6 p-6 text-center">
          <h2 className="text-lg font-bold">Coordiná tu retiro por WhatsApp</h2>
          <p className="mt-1 text-sm text-navy/70">
            El retiro es en la <strong>zona de Av. Constitución (Mar del Plata)</strong>. Escribinos
            por WhatsApp con tu pedido para coordinar el punto exacto y la <strong>seña</strong>. El
            resto lo pagás cuando lo retirás.
          </p>
          <a
            href={whatsappLink(whatsappNumber, retiroMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-wsp mt-4 w-full"
          >
            Coordinar retiro por WhatsApp
          </a>
          <Link href="/" className="mt-3 inline-block text-sm text-navy/60 hover:text-navy">
            Volver al inicio
          </Link>
        </div>
      ) : payMethod === 'transfer' ? (
        <div className="card mt-6 p-6">
          <h2 className="text-lg font-bold">Pagá por transferencia</h2>
          <p className="mt-1 text-sm text-navy/70">
            {transfer?.instructions ||
              'Una vez realizada la transferencia, envianos el comprobante por WhatsApp indicando tu número de pedido.'}
          </p>
          <dl className="mt-4 space-y-3">
            <DataRow label="Alias" value={transfer?.alias} copy />
            <DataRow label="CBU / CVU" value={transfer?.cbu} copy />
            <DataRow label="Titular" value={transfer?.holder} />
            <DataRow label="Banco / Billetera" value={transfer?.bank} />
            {transfer?.cuit && <DataRow label="CUIT" value={transfer.cuit} />}
            <DataRow label="Monto" value={formatPrice(order.total)} />
          </dl>

          {/* Subida de comprobante en la web */}
          <TransferProofUpload orderNumber={order.order_number} />
        </div>
      ) : (
        <div className="card mt-6 p-6">
          <h2 className="text-lg font-bold">Pagá con Mercado Pago</h2>
          <p className="mt-1 text-sm text-navy/70">
            Tu pedido quedó registrado. Al finalizar el pago por Mercado Pago, envianos el
            comprobante por WhatsApp junto con tu número de pedido para confirmar la compra.
          </p>
          <MercadoPagoButton
            orderNumber={order.order_number}
            fallbackLink={mp?.link || 'https://link.mercadopago.com.ar/mgbsoftwarefactory'}
            checkoutProEnabled={Boolean(mp?.checkout_pro_active) && isMercadoPagoProEnabled()}
          />
        </div>
      )}

      {/* Enviar comprobante */}
      {!isRetiro && (
        <div className="card mt-6 p-6 text-center">
          <p className="text-sm text-navy/70">
            Cuando tengas el comprobante, enviánoslo por WhatsApp para confirmar tu pedido.
          </p>
          <a
            href={whatsappLink(whatsappNumber, comprobanteMsg)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-wsp mt-3 w-full"
          >
            Enviar comprobante por WhatsApp
          </a>
          <Link href="/" className="mt-3 inline-block text-sm text-navy/60 hover:text-navy">
            Volver al inicio
          </Link>
        </div>
      )}
    </div>
  );
}

function DataRow({
  label,
  value,
  copy,
}: {
  label: string;
  value?: string | null;
  copy?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-navy/5 pb-2">
      <div>
        <dt className="text-xs uppercase tracking-wide text-navy/50">{label}</dt>
        <dd className="font-semibold text-navy">{value}</dd>
      </div>
      {copy && <CopyButton value={value} label="Copiar" />}
    </div>
  );
}
