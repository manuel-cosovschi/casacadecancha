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

  const comprobanteMsg = `Hola, realicé el pedido #${order.order_number}.\nElegí pagar por ${
    payMethod === 'transfer' ? 'transferencia' : 'Mercado Pago'
  }.\nAdjunto comprobante.`;

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
          {/(resto del país|abonar)/i.test(order.shipping_method) ? (
            <p className="mt-2 rounded-lg bg-celeste/15 p-2 text-sm text-navy">
              📦 El costo del envío se abona <strong>al recibir el producto</strong> (pago contra entrega).
            </p>
          ) : (
            <p className="mt-2 rounded-lg bg-celeste/15 p-2 text-sm text-navy">
              🛵 Coordinamos la entrega en Mar del Plata por WhatsApp, <strong>sin costo</strong>.
            </p>
          )}
        </div>
      )}

      {/* Instrucciones según método */}
      {payMethod === 'transfer' ? (
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
