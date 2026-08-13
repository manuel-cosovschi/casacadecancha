import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Logo } from '@/components/brand/Logo';
import { PrintBar } from '@/components/admin/PrintBar';
import { getAdminOrder, getEncargoById } from '@/lib/admin/data';
import { getAllSettings } from '@/lib/settings';
import { formatPrice } from '@/lib/utils';

export const metadata: Metadata = { robots: { index: false, follow: false } };

interface Line {
  name: string;
  size: string | null;
  qty: number;
  unit: number;
  subtotal: number;
}

const fecha = (d: string | null | undefined) =>
  d
    ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

const PAY_LABEL: Record<string, string> = {
  transfer: 'Transferencia',
  mercadopago: 'Mercado Pago',
  cash: 'Efectivo',
  other: 'Otro',
};

export default async function ComprobantePage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  if (kind !== 'pedido' && kind !== 'encargo') notFound();

  const settings = await getAllSettings();
  const wsp = settings.whatsapp?.number || settings.footer?.whatsapp || '';
  const ig = (settings.footer?.instagram || '') as string;

  let ref = '';
  let dateStr = '';
  let customer = '';
  let contact = '';
  let address = '';
  let lines: Line[] = [];
  let subtotal = 0;
  let discount = 0;
  let shipping = 0;
  let extra = 0; // recargo Mercado Pago
  let total = 0;
  let paid = 0;
  let payMethod = '';
  let payLabel = '';
  let delivered = false;
  let notes = '';
  let backHref = '';
  let tracking = '';

  if (kind === 'pedido') {
    const order = await getAdminOrder(decodeURIComponent(id));
    if (!order) notFound();
    ref = `#${order.order_number}`;
    dateStr = fecha(order.created_at);
    customer = order.customer_name || 'Cliente';
    contact = order.customer_phone || order.customer_email || '';
    address = [order.address, order.city, order.province, order.postal_code]
      .filter(Boolean)
      .join(', ');
    lines = (order.order_items ?? []).map((it: any) => ({
      name: it.product_name || 'Producto',
      size: it.size,
      qty: it.quantity || 1,
      unit: Number(it.unit_price) || 0,
      subtotal: Number(it.subtotal) || 0,
    }));
    subtotal = Number(order.subtotal) || 0;
    discount = Number(order.discount) || 0;
    shipping = Number(order.shipping_cost) || 0;
    total = Number(order.total) || 0;
    extra = Math.max(0, total - (subtotal - discount + shipping));
    paid = order.payment_status === 'paid' ? total : 0;
    payMethod = order.payment_method || '';
    payLabel = PAY_LABEL[payMethod] || payMethod;
    delivered = order.order_status === 'delivered';
    notes = order.shipping_method || '';
    tracking = order.tracking_ref || '';
    backHref = `/admin/pedidos/${order.order_number}`;
  } else {
    const enc = await getEncargoById(id);
    if (!enc) notFound();
    ref = `Encargo ${String(enc.id).slice(0, 8).toUpperCase()}`;
    dateStr = fecha(enc.created_at);
    customer = enc.customer_name || 'Cliente';
    contact = enc.contact || '';
    lines = (enc.items ?? []).map((it: any) => ({
      name: it.product || 'Producto',
      size: it.size,
      qty: it.quantity || 1,
      unit: Number(it.sale_price) || 0,
      subtotal: (Number(it.sale_price) || 0) * (it.quantity || 1),
    }));
    subtotal = lines.reduce((a, l) => a + l.subtotal, 0);
    total = subtotal;
    const ps = enc.payment_status ?? (enc.paid ? 'paid' : 'unpaid');
    paid = ps === 'paid' ? total : ps === 'deposit' ? Math.min(Number(enc.paid_amount) || 0, total) : 0;
    payLabel = ps === 'paid' ? 'Pagado' : ps === 'deposit' ? 'Seña abonada' : 'A pagar';
    delivered = enc.status === 'entregado';
    // Las notas del encargo son internas (seña, saldo, proveedor): no van en el comprobante.
    notes = '';
    backHref = '/admin/encargos';
  }

  const saldo = Math.max(0, total - paid);

  return (
    <>
      <PrintBar back={backHref} hint="Se guarda como PDF desde el menú de impresión" />

      <div className="mx-auto max-w-[820px] bg-white p-8 shadow-card print:max-w-none print:p-0 print:shadow-none">
        {/* Encabezado */}
        <header className="flex items-start justify-between gap-4 border-b-2 border-navy pb-4">
          <div>
            <Logo theme="light" />
            <p className="mt-2 text-xs text-navy/60">
              Mar del Plata, Argentina
              {wsp && ` · WhatsApp ${wsp}`}
            </p>
            {ig && <p className="text-xs text-navy/60">{ig.replace(/^https?:\/\//, '')}</p>}
          </div>
          <div className="text-right">
            <p className="text-xl font-black uppercase tracking-tight text-navy">
              {delivered ? 'Comprobante de entrega' : 'Comprobante'}
            </p>
            <p className="mt-0.5 font-mono text-sm font-bold text-navy">{ref}</p>
            <p className="text-xs text-navy/60">Fecha: {dateStr}</p>
            {tracking && <p className="text-xs text-navy/60">Seguimiento: {tracking}</p>}
          </div>
        </header>

        {/* Cliente */}
        <section className="grid gap-4 py-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-navy/45">Cliente</p>
            <p className="mt-1 font-bold text-navy">{customer}</p>
            {contact && <p className="text-sm text-navy/70">{contact}</p>}
            {address && <p className="text-sm text-navy/70">{address}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-navy/45">Entrega</p>
            <p className="mt-1 text-sm font-semibold text-navy">
              {delivered ? '✔ Entregado' : 'Pendiente de entrega'}
            </p>
            {notes && <p className="text-sm text-navy/70">{notes}</p>}
            {payLabel && <p className="text-sm text-navy/70">Pago: {payLabel}</p>}
          </div>
        </section>

        {/* Detalle */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-navy/15 text-left text-[10px] uppercase tracking-widest text-navy/50">
              <th className="py-2">Producto</th>
              <th className="py-2">Talle</th>
              <th className="py-2 text-center">Cant.</th>
              <th className="py-2 text-right">Precio</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="border-b border-navy/5">
                <td className="py-2 font-medium text-navy">{l.name}</td>
                <td className="py-2 text-navy/70">{l.size || '—'}</td>
                <td className="py-2 text-center text-navy/70">{l.qty}</td>
                <td className="py-2 text-right text-navy/70">{formatPrice(l.unit)}</td>
                <td className="py-2 text-right font-semibold text-navy">{formatPrice(l.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <section className="mt-4 flex justify-end">
          <dl className="w-full max-w-xs space-y-1 text-sm">
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            {discount > 0 && <Row label="Descuento" value={`- ${formatPrice(discount)}`} />}
            {shipping > 0 && <Row label="Envío" value={formatPrice(shipping)} />}
            {extra > 0 && <Row label="Recargo Mercado Pago" value={`+ ${formatPrice(extra)}`} />}
            <div className="flex justify-between border-t-2 border-navy pt-1.5">
              <dt className="font-black uppercase text-navy">Total</dt>
              <dd className="text-lg font-black text-navy">{formatPrice(total)}</dd>
            </div>
            {paid > 0 && paid < total && (
              <>
                <Row label="Abonado" value={formatPrice(paid)} />
                <Row label="Saldo pendiente" value={formatPrice(saldo)} strong />
              </>
            )}
            {paid >= total && total > 0 && (
              <p className="pt-1 text-right text-xs font-bold uppercase tracking-wide text-green-700">
                Pagado en su totalidad
              </p>
            )}
          </dl>
        </section>

        {/* Pie */}
        <footer className="mt-8 border-t border-navy/10 pt-4 text-center">
          <p className="text-sm font-bold text-navy">¡Gracias por tu compra! 💙</p>
          <p className="mt-1 text-xs text-navy/60">
            {delivered
              ? 'Este comprobante certifica la entrega de los productos detallados.'
              : 'Comprobante del pedido detallado arriba.'}
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-navy/40">
            Casaca de Cancha · Vestí Fútbol
          </p>
        </footer>
      </div>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-navy/60">{label}</dt>
      <dd className={strong ? 'font-bold text-navy' : 'font-medium text-navy'}>{value}</dd>
    </div>
  );
}
