'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  setOrderStatus,
  setPaymentStatus,
  updateOrderFields,
} from '../actions';
import type { OrderStatus, PaymentStatus } from '@/lib/types';

const PAYMENT_STATES: PaymentStatus[] = [
  'pending_payment',
  'payment_review',
  'paid',
  'refunded',
  'rejected',
  'cancelled',
];
const ORDER_STATES: OrderStatus[] = [
  'new',
  'preparing',
  'ready',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
  'exchanged',
];

const LABELS: Record<string, string> = {
  pending_payment: 'Pago pendiente',
  payment_review: 'En revisión',
  paid: 'Pagado',
  refunded: 'Reembolsado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  new: 'Nuevo',
  preparing: 'Preparando',
  ready: 'Listo',
  shipped: 'Despachado',
  delivered: 'Entregado',
  returned: 'Devuelto',
  exchanged: 'Cambiado',
};

export function OrderControls({ order }: { order: any }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function changePayment(status: PaymentStatus) {
    setBusy(true);
    setMsg(null);
    const res = await setPaymentStatus(order.id, order.order_number, status, reference);
    setBusy(false);
    if (res.error) setMsg(res.error);
    else router.refresh();
  }

  async function changeOrder(status: OrderStatus) {
    setBusy(true);
    setMsg(null);
    const res = await setOrderStatus(order.id, order.order_number, status);
    setBusy(false);
    if (res.error) setMsg(res.error);
    else router.refresh();
  }

  async function saveShipping(formData: FormData) {
    setBusy(true);
    await updateOrderFields(formData);
    setBusy(false);
    setMsg('Datos guardados.');
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* Pago */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Estado de pago</h2>
        <label className="mb-3 block text-xs">
          <span className="label">Referencia / Comprobante (opcional)</span>
          <input value={reference} onChange={(e) => setReference(e.target.value)} className="input !py-1.5" placeholder="N° operación, alias, etc." />
        </label>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_STATES.map((s) => (
            <button
              key={s}
              disabled={busy || order.payment_status === s}
              onClick={() => changePayment(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                order.payment_status === s ? 'bg-navy text-cream' : 'border border-navy/20 hover:bg-navy/5'
              }`}
            >
              {LABELS[s]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-navy/50">
          Al marcar “Pagado” se descuenta el stock definitivamente.
        </p>
      </div>

      {/* Pedido */}
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Estado del pedido</h2>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATES.map((s) => (
            <button
              key={s}
              disabled={busy || order.order_status === s}
              onClick={() => changeOrder(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                order.order_status === s ? 'bg-navy text-cream' : 'border border-navy/20 hover:bg-navy/5'
              }`}
            >
              {LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Envío e internas */}
      <form action={saveShipping} className="card space-y-3 p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Envío y notas internas</h2>
        <input type="hidden" name="order_id" value={order.id} />
        <input type="hidden" name="order_number" value={order.order_number} />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs">
            <span className="label">Transportista</span>
            <input name="carrier" defaultValue={order.carrier ?? ''} className="input !py-1.5" />
          </label>
          <label className="text-xs">
            <span className="label">Tracking</span>
            <input name="tracking_code" defaultValue={order.tracking_code ?? ''} className="input !py-1.5" />
          </label>
          <label className="text-xs">
            <span className="label">Costo de envío</span>
            <input name="shipping_cost" type="number" min="0" defaultValue={order.shipping_cost ?? 0} className="input !py-1.5" />
          </label>
        </div>
        <label className="block text-xs">
          <span className="label">Notas internas</span>
          <textarea name="internal_notes" defaultValue={order.internal_notes ?? ''} className="input min-h-20" />
        </label>
        <button type="submit" disabled={busy} className="btn-primary">Guardar</button>
      </form>

      {msg && <p className="text-sm text-navy/70">{msg}</p>}
    </div>
  );
}
