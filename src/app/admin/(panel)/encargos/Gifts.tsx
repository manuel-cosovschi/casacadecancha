'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createGift, deleteGift } from './gift-actions';
import { formatPrice } from '@/lib/utils';

interface CatalogVariant {
  id: string;
  productName: string;
  size: string | null;
  label: string;
  cost?: number;
}

interface Gift {
  id: string;
  product: string;
  size: string | null;
  quantity: number;
  unit_cost: number;
  recipient: string | null;
  reason: string | null;
  variant_id: string | null;
}

export function Gifts({ catalog = [], gifts = [] }: { catalog?: CatalogVariant[]; gifts?: Gift[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [variantId, setVariantId] = useState('');
  const [product, setProduct] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [recipient, setRecipient] = useState('');

  function selectVariant(id: string) {
    setVariantId(id);
    if (id) {
      const v = catalog.find((c) => c.id === id);
      setProduct(v?.productName || '');
      setSize(v?.size || '');
      if (v?.cost && v.cost > 0) setUnitCost(Math.round(v.cost));
    }
  }

  function reset() {
    setVariantId('');
    setProduct('');
    setSize('');
    setQty(1);
    setUnitCost(0);
    setRecipient('');
    setError(null);
  }

  function submit() {
    if (!product.trim()) {
      setError('Elegí o escribí el modelo.');
      return;
    }
    if (qty < 1) {
      setError('Ingresá una cantidad de 1 o más.');
      return;
    }
    start(async () => {
      const res = await createGift({ product, size, quantity: qty, unitCost, recipient, variant_id: variantId || null });
      if (res?.error) {
        setError(res.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm('¿Eliminar este regalo? Se devuelve el stock y se quita la pérdida.')) return;
    start(async () => {
      await deleteGift(id);
      router.refresh();
    });
  }

  const totalPerdida = gifts.reduce((a, g) => a + g.quantity * Number(g.unit_cost), 0);

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Regalos / cortesías</h2>
          <p className="text-xs text-navy/50">Camisetas que regalaste: salen del stock y cuentan como pérdida (su costo) en Rentabilidad.</p>
        </div>
        {!open && <button onClick={() => setOpen(true)} className="btn-primary !py-2">+ Nuevo regalo</button>}
      </div>

      {open && (
        <div className="mt-3 rounded-xl border border-navy/10 p-3">
          {catalog.length > 0 && (
            <label className="block text-xs">
              <span className="text-[11px] text-navy/50">Producto web (descuenta stock de la tienda)</span>
              <select value={variantId} onChange={(e) => selectVariant(e.target.value)} className="input !py-1.5">
                <option value="">Producto manual (solo afecta esta tabla)</option>
                {catalog.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-12 sm:items-end">
            <label className="col-span-2 text-xs sm:col-span-4">
              <span className="text-[11px] text-navy/50">Modelo *</span>
              <input value={product} onChange={(e) => setProduct(e.target.value)} className="input !py-1.5" placeholder="Titular 2026" />
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="text-[11px] text-navy/50">Talle</span>
              <input value={size} onChange={(e) => setSize(e.target.value)} className="input !py-1.5" placeholder="M" />
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="text-[11px] text-navy/50">Cantidad</span>
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Number(e.target.value))} className="input !py-1.5" />
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="text-[11px] text-navy/50">Costo U.</span>
              <input type="number" min={0} value={unitCost} onChange={(e) => setUnitCost(Number(e.target.value))} className="input !py-1.5" placeholder="14000" />
            </label>
            <label className="col-span-2 text-xs sm:col-span-2">
              <span className="text-[11px] text-navy/50">Para quién</span>
              <input value={recipient} onChange={(e) => setRecipient(e.target.value)} className="input !py-1.5" placeholder="Opcional" />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-navy/50">Pérdida que se registra: <b className="text-navy">{formatPrice(qty * unitCost)}</b> (costo × cantidad).</p>
          {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={submit} disabled={pending} className="btn-primary !py-2">Registrar regalo</button>
            <button onClick={() => { reset(); setOpen(false); }} className="btn-outline !py-2">Cancelar</button>
          </div>
        </div>
      )}

      {gifts.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="text-left text-navy/50">
                <th className="py-2">Modelo</th>
                <th className="py-2">Talle</th>
                <th className="py-2 text-center">Cant.</th>
                <th className="py-2 text-right">Pérdida</th>
                <th className="py-2">Para quién</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {gifts.map((g) => (
                <tr key={g.id} className="border-t border-navy/5">
                  <td className="py-2 font-medium">{g.product}</td>
                  <td className="py-2">{g.size || '—'}</td>
                  <td className="py-2 text-center">{g.quantity}</td>
                  <td className="py-2 text-right font-semibold text-red-600">{formatPrice(g.quantity * Number(g.unit_cost))}</td>
                  <td className="py-2 text-navy/60">{g.recipient || '—'}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => remove(g.id)} disabled={pending} className="text-xs font-semibold text-red-600 hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-navy/10">
                <td colSpan={3} className="py-2 text-right text-xs font-semibold text-navy/50">Pérdida total</td>
                <td className="py-2 text-right font-bold text-red-600">{formatPrice(totalPerdida)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
