'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addStockAdjustment, deleteStockAdjustment } from './stock-adjust-actions';

interface CatalogVariant {
  id: string;
  productName: string;
  size: string | null;
  label: string;
}

interface Adjustment {
  id: string;
  product: string;
  size: string | null;
  delta: number;
  reason: string | null;
  variant_id: string | null;
  created_at: string;
}

export function StockAdjustments({
  catalog = [],
  adjustments = [],
}: {
  catalog?: CatalogVariant[];
  adjustments?: Adjustment[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [variantId, setVariantId] = useState('');
  const [product, setProduct] = useState('');
  const [size, setSize] = useState('');
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('');

  function selectVariant(id: string) {
    setVariantId(id);
    if (id) {
      const v = catalog.find((c) => c.id === id);
      setProduct(v?.productName || '');
      setSize(v?.size || '');
    }
  }

  function reset() {
    setVariantId('');
    setProduct('');
    setSize('');
    setDelta(0);
    setReason('');
    setError(null);
  }

  function submit() {
    if (!product.trim()) {
      setError('Elegí o escribí el modelo.');
      return;
    }
    if (!delta) {
      setError('Ingresá una cantidad distinta de cero (usá − para restar).');
      return;
    }
    start(async () => {
      const res = await addStockAdjustment({ product, size, delta, reason, variant_id: variantId || null });
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
    if (!confirm('¿Eliminar este ajuste? Se revierte su efecto en el stock.')) return;
    start(async () => {
      await deleteStockAdjustment(id);
      router.refresh();
    });
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Ajustes manuales de stock</h2>
          <p className="text-xs text-navy/50">Corregí cantidades por modelo y talle (usá − para restar). Si elegís un producto web, también corrige el stock de la tienda.</p>
        </div>
        {!open && <button onClick={() => setOpen(true)} className="btn-primary !py-2">+ Nuevo ajuste</button>}
      </div>

      {open && (
        <div className="mt-3 rounded-xl border border-navy/10 p-3">
          {catalog.length > 0 && (
            <label className="block text-xs">
              <span className="text-[11px] text-navy/50">Producto web (también ajusta stock de la tienda)</span>
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
              <span className="text-[11px] text-navy/50">Ajuste (+/−)</span>
              <input type="number" value={delta} onChange={(e) => setDelta(Number(e.target.value))} className="input !py-1.5" placeholder="-1" />
            </label>
            <label className="col-span-2 text-xs sm:col-span-4">
              <span className="text-[11px] text-navy/50">Motivo (opcional)</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} className="input !py-1.5" placeholder="Conteo físico, rotura, error de carga…" />
            </label>
          </div>
          {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={submit} disabled={pending} className="btn-primary !py-2">Guardar ajuste</button>
            <button onClick={() => { reset(); setOpen(false); }} className="btn-outline !py-2">Cancelar</button>
          </div>
        </div>
      )}

      {adjustments.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="text-left text-navy/50">
                <th className="py-2">Modelo</th>
                <th className="py-2">Talle</th>
                <th className="py-2 text-center">Ajuste</th>
                <th className="py-2">Motivo</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => (
                <tr key={a.id} className="border-t border-navy/5">
                  <td className="py-2 font-medium">{a.product}</td>
                  <td className="py-2">{a.size || '—'}</td>
                  <td className="py-2 text-center">
                    <span className={`font-semibold ${a.delta < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {a.delta > 0 ? `+${a.delta}` : a.delta}
                    </span>
                  </td>
                  <td className="py-2 text-navy/60">{a.reason || '—'}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => remove(a.id)} disabled={pending} className="text-xs font-semibold text-red-600 hover:underline">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
