'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCobro } from './actions';
import { formatPrice } from '@/lib/utils';

export interface CobroProduct {
  id: string;
  name: string;
  price: number;
  sizes: string[];
}

export function CobroForm({ products }: { products: CobroProduct[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [manual, setManual] = useState(false);
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const product = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const autoAmount = product ? product.price * Math.max(1, qty) : 0;
  const total = manual ? Math.max(0, Math.round(Number(amount) || 0)) : autoAmount;

  async function submit() {
    setError(null);
    if (total <= 0) {
      setError(manual ? 'Ingresá el monto.' : 'Elegí un producto.');
      return;
    }
    const nombre = manual
      ? concept.trim() || 'Cobro'
      : `${product?.name}${size ? ` · Talle ${size}` : ''}${qty > 1 ? ` ×${qty}` : ''}`;

    setBusy(true);
    const res = await createCobro({
      concept: nombre,
      amount: total,
      items: manual
        ? []
        : [{ name: product?.name || '', size: size || null, quantity: qty, unit_price: product?.price || 0 }],
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'No se pudo generar el cobro.');
      return;
    }
    // Se muestra arriba de la lista, con su QR listo para escanear.
    router.refresh();
    setProductId('');
    setSize('');
    setQty(1);
    setConcept('');
    setAmount('');
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Nuevo cobro</h2>
        <button
          type="button"
          onClick={() => {
            setManual((v) => !v);
            setError(null);
          }}
          className="text-xs font-semibold text-navy/60 hover:text-navy hover:underline"
        >
          {manual ? '← Elegir del catálogo' : 'Monto libre →'}
        </button>
      </div>

      {manual ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Concepto</label>
            <input
              className="input"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej: Camiseta + envío"
            />
          </div>
          <div>
            <label className="label">Monto</label>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ej: 60000"
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label">Producto</label>
            <select
              className="input"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setSize('');
                setError(null);
              }}
            >
              <option value="">Elegí un producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatPrice(p.price)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Talle</label>
            <select
              className="input"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              disabled={!product}
            >
              <option value="">—</option>
              {(product?.sizes ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Cantidad</label>
            <input
              className="input"
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-navy/70">
          Total a cobrar: <strong className="text-lg text-navy">{formatPrice(total)}</strong>
        </p>
        <button onClick={submit} disabled={busy} className="btn-primary !py-2">
          {busy ? 'Generando…' : 'Generar QR'}
        </button>
      </div>
    </div>
  );
}
