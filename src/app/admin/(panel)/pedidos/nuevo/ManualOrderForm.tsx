'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createManualOrder } from './actions';
import { AR_PROVINCES } from '@/lib/provinces';
import { formatPrice } from '@/lib/utils';

interface Item {
  product_name: string;
  size: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
}

const empty: Item = { product_name: '', size: '', quantity: 1, unit_price: 0, unit_cost: 0 };

export function ManualOrderForm() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([{ ...empty }]);
  const [channel, setChannel] = useState('whatsapp');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [shipping, setShipping] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((a, i) => a + i.unit_price * i.quantity, 0);
  const total = subtotal - discount + shipping;

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  async function submit() {
    if (!customerName) {
      setError('Ingresá el nombre del cliente.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await createManualOrder({
      channel: channel as any,
      customer_name: customerName,
      customer_phone: phone,
      province,
      payment_method: paymentMethod as any,
      payment_status: paymentStatus as any,
      shipping_cost: shipping,
      discount,
      notes,
      items: items.filter((i) => i.product_name),
    });
    setBusy(false);
    if (res.error) setError(res.error);
    else if (res.orderNumber) router.push(`/admin/pedidos/${res.orderNumber}`);
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Cliente y canal</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs">
            <span className="label">Canal</span>
            <select value={channel} onChange={(e) => setChannel(e.target.value)} className="input">
              {['whatsapp', 'instagram', 'facebook', 'local', 'referido', 'familia', 'otro'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <span className="label">Nombre del cliente *</span>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input" />
          </label>
          <label className="text-xs">
            <span className="label">WhatsApp</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
          </label>
          <label className="text-xs">
            <span className="label">Provincia</span>
            <select value={province} onChange={(e) => setProvince(e.target.value)} className="input">
              <option value="">—</option>
              {AR_PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Productos</h2>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex flex-wrap items-end gap-2">
              <label className="flex-1 text-xs">
                <span className="label">Producto</span>
                <input value={it.product_name} onChange={(e) => updateItem(idx, { product_name: e.target.value })} className="input !py-1.5" />
              </label>
              <label className="text-xs">
                <span className="label">Talle</span>
                <input value={it.size} onChange={(e) => updateItem(idx, { size: e.target.value })} className="input !py-1.5 w-16" />
              </label>
              <label className="text-xs">
                <span className="label">Cant.</span>
                <input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} className="input !py-1.5 w-16" />
              </label>
              <label className="text-xs">
                <span className="label">Precio</span>
                <input type="number" min="0" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} className="input !py-1.5 w-24" />
              </label>
              <label className="text-xs">
                <span className="label">Costo</span>
                <input type="number" min="0" value={it.unit_cost} onChange={(e) => updateItem(idx, { unit_cost: Number(e.target.value) })} className="input !py-1.5 w-24" />
              </label>
              <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="pb-2 text-xs text-red-600">
                Quitar
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setItems((p) => [...p, { ...empty }])} className="mt-3 text-sm font-semibold text-navy hover:underline">
          + Agregar producto
        </button>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Pago y totales</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs">
            <span className="label">Medio de pago</span>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input">
              <option value="transfer">Transferencia</option>
              <option value="mercadopago">Mercado Pago</option>
              <option value="cash">Efectivo</option>
              <option value="other">Otro</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="label">Estado de pago</span>
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="input">
              <option value="paid">Pagado</option>
              <option value="pending_payment">Pendiente</option>
              <option value="payment_review">En revisión</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="label">Envío</span>
            <input type="number" min="0" value={shipping} onChange={(e) => setShipping(Number(e.target.value))} className="input" />
          </label>
          <label className="text-xs">
            <span className="label">Descuento</span>
            <input type="number" min="0" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="input" />
          </label>
        </div>
        <label className="mt-3 block text-xs">
          <span className="label">Notas</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-16" />
        </label>
        <div className="mt-4 flex items-center justify-between border-t border-navy/10 pt-3">
          <span className="text-sm text-navy/60">Total</span>
          <span className="text-xl font-bold">{formatPrice(total)}</span>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <button onClick={submit} disabled={busy} className="btn-primary">
        {busy ? 'Guardando…' : 'Crear pedido'}
      </button>
    </div>
  );
}
