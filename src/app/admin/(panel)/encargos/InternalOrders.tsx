'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createInternalOrder, setInternalOrderStatus, deleteInternalOrder } from './internal-actions';
import { formatPrice } from '@/lib/utils';

interface Seller {
  id: string;
  name: string;
}
interface Order {
  id: string;
  product: string;
  size: string | null;
  quantity: number;
  unit_cost: number;
  status: string;
  counterpart: string;
}
interface CatalogVariant {
  id: string;
  productName: string;
  size: string | null;
  label: string;
}

export function InternalOrders({
  sellers = [],
  outgoing = [],
  incoming = [],
  catalog = [],
}: {
  sellers?: Seller[];
  outgoing?: Order[];
  incoming?: Order[];
  catalog?: CatalogVariant[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [providerId, setProviderId] = useState(sellers[0]?.id ?? '');
  const [product, setProduct] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);

  function selectVariant(id: string) {
    const v = catalog.find((c) => c.id === id);
    if (v) {
      setProduct(v.productName);
      setSize(v.size || '');
    }
  }

  function submit() {
    if (!providerId) {
      setError('Elegí a quién pedirle.');
      return;
    }
    if (!product.trim()) {
      setError('Elegí o escribí el modelo.');
      return;
    }
    start(async () => {
      const res = await createInternalOrder({ providerId, product, size, quantity: qty });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setProduct('');
      setSize('');
      setQty(1);
      setError(null);
      setOpen(false);
      router.refresh();
    });
  }

  function toggle(o: Order) {
    start(async () => {
      await setInternalOrderStatus(o.id, o.status === 'entregado' ? 'pendiente' : 'entregado');
      router.refresh();
    });
  }
  function remove(id: string) {
    if (!confirm('¿Eliminar este pedido?')) return;
    start(async () => {
      await deleteInternalOrder(id);
      router.refresh();
    });
  }

  // Sin otros vendedores y sin movimientos, no mostramos nada.
  if (sellers.length === 0 && outgoing.length === 0 && incoming.length === 0) return null;

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Pedidos entre vendedores</h2>
          <p className="text-xs text-navy/50">Pedile camisetas a otro vendedor para cubrir tus encargos. Te suma stock; a quien le pedís, se lo reserva.</p>
        </div>
        {!open && sellers.length > 0 && (
          <button onClick={() => setOpen(true)} className="btn-primary !py-2">+ Pedir a otro</button>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-xl border border-navy/10 p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-12 sm:items-end">
            <label className="col-span-2 text-xs sm:col-span-3">
              <span className="text-[11px] text-navy/50">Pedirle a</span>
              <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="input !py-1.5">
                {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            {catalog.length > 0 && (
              <label className="col-span-2 text-xs sm:col-span-3">
                <span className="text-[11px] text-navy/50">Del catálogo</span>
                <select onChange={(e) => selectVariant(e.target.value)} className="input !py-1.5" defaultValue="">
                  <option value="">Elegir…</option>
                  {catalog.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </label>
            )}
            <label className="col-span-2 text-xs sm:col-span-3">
              <span className="text-[11px] text-navy/50">Modelo *</span>
              <input value={product} onChange={(e) => setProduct(e.target.value)} className="input !py-1.5" placeholder="Titular 2026" />
            </label>
            <label className="text-xs sm:col-span-1">
              <span className="text-[11px] text-navy/50">Talle</span>
              <input value={size} onChange={(e) => setSize(e.target.value)} className="input !py-1.5" placeholder="M" />
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="text-[11px] text-navy/50">Cant.</span>
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="input !py-1.5" />
            </label>
          </div>
          {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={submit} disabled={pending} className="btn-primary !py-2">Pedir</button>
            <button onClick={() => { setOpen(false); setError(null); }} className="btn-outline !py-2">Cancelar</button>
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy/40">Le pedí a otros</p>
          <ul className="mt-1 space-y-1.5">
            {outgoing.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-navy/80">
                  {o.quantity}× {o.product}{o.size ? ` · ${o.size}` : ''} <span className="text-navy/50">a {o.counterpart}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className={`badge ${o.status === 'entregado' ? 'bg-green-100 text-green-800' : 'border border-amber-300 text-amber-700'}`}>
                    {o.status === 'entregado' ? '✓ Recibido' : 'Pendiente'}
                  </span>
                  <button onClick={() => remove(o.id)} disabled={pending} className="text-xs font-semibold text-red-600 hover:underline">✕</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {incoming.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy/40">Me pidieron (sale de mi stock)</p>
          <ul className="mt-1 space-y-1.5">
            {incoming.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-navy/80">
                  {o.quantity}× {o.product}{o.size ? ` · ${o.size}` : ''} <span className="text-navy/50">para {o.counterpart}</span>
                </span>
                <button
                  onClick={() => toggle(o)}
                  disabled={pending}
                  className={`badge ${o.status === 'entregado' ? 'bg-green-100 text-green-800' : 'border border-amber-300 text-amber-700'}`}
                >
                  {o.status === 'entregado' ? '✓ Entregado' : 'Marcar entregado'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
