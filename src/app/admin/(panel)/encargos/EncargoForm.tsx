'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveEncargo } from './actions';
import { formatPrice } from '@/lib/utils';

interface Item {
  product: string;
  size: string;
  quantity: number;
  variant_id: string;
  sale_price: number;
  unit_cost: number;
}

export interface MatrixRow {
  key: string;
  product: string;
  size: string;
  reserved: number;
  ordered: number;
  adjusted?: number;
  gifted?: number;
}

export interface CatalogVariant {
  id: string;
  productName: string;
  size: string | null;
  label: string;
  cost?: number;
}

const emptyItem: Item = { product: '', size: '', quantity: 1, variant_id: '', sale_price: 0, unit_cost: 0 };

const STATUS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_camino', label: 'En camino' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];

function keyOf(product: string, size: string) {
  return `${product.trim().toLowerCase()}|${(size || '').trim().toLowerCase()}`;
}

export function EncargoForm({
  encargo,
  matrix = [],
  catalog = [],
  onDone,
  onCancel,
}: {
  encargo?: any;
  matrix?: MatrixRow[];
  catalog?: CatalogVariant[];
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState(encargo?.customer_name ?? '');
  const [contact, setContact] = useState(encargo?.contact ?? '');
  const [supplier, setSupplier] = useState(encargo?.supplier ?? '');
  const [status, setStatus] = useState(encargo?.status ?? 'pendiente');
  const [payment, setPayment] = useState<'unpaid' | 'deposit' | 'paid'>(
    encargo?.payment_status ?? (encargo?.paid ? 'paid' : 'unpaid'),
  );
  const [notes, setNotes] = useState(encargo?.notes ?? '');
  const [items, setItems] = useState<Item[]>(
    encargo?.items?.length
      ? encargo.items.map((i: any) => ({
          product: i.product ?? '',
          size: i.size ?? '',
          quantity: i.quantity ?? 1,
          variant_id: i.variant_id ?? '',
          sale_price: Number(i.sale_price) || 0,
          unit_cost: Number(i.unit_cost) || 0,
        }))
      : [{ ...emptyItem }],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lo que este encargo ya reserva (para no contarlo dos veces al editar).
  const ownReserved = new Map<string, number>();
  for (const i of encargo?.items ?? []) {
    const k = keyOf(i.product ?? '', i.size ?? '');
    ownReserved.set(k, (ownReserved.get(k) || 0) + (i.quantity || 0));
  }

  /** Stock libre (comprado − reservado por OTROS encargos) para un modelo+talle. */
  function freeStock(product: string, size: string) {
    if (!product.trim()) return null;
    const k = keyOf(product, size);
    const m = matrix.find((r) => r.key === k);
    const reserved = (m?.reserved || 0) - (ownReserved.get(k) || 0);
    const ordered = (m?.ordered || 0) + (m?.adjusted || 0) - (m?.gifted || 0);
    return ordered - reserved;
  }

  const total = items.reduce((a, i) => a + i.sale_price * i.quantity, 0);
  const cost = items.reduce((a, i) => a + i.unit_cost * i.quantity, 0);
  const margin = total - cost;

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function selectVariant(idx: number, id: string) {
    if (!id) {
      updateItem(idx, { variant_id: '' });
      return;
    }
    const v = catalog.find((c) => c.id === id);
    const patch: Partial<Item> = { variant_id: id, product: v?.productName || '', size: v?.size || '' };
    if (v?.cost && v.cost > 0) patch.unit_cost = v.cost; // autocompleta costo (producto + envío prorrateado)
    updateItem(idx, patch);
  }

  async function submit() {
    if (!customerName.trim()) {
      setError('Ingresá el nombre del cliente.');
      return;
    }
    if (!items.some((i) => i.product.trim())) {
      setError('Agregá al menos un ítem con su modelo.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await saveEncargo({
      id: encargo?.id,
      customer_name: customerName,
      contact,
      supplier,
      payment_status: payment,
      status,
      notes,
      items,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onDone?.();
    router.refresh();
  }

  return (
    <div className="card space-y-4 p-4 sm:p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
        {encargo ? 'Editar encargo' : 'Nuevo encargo'}
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Cliente *"><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input" /></Field>
        <Field label="Contacto (WhatsApp)"><input value={contact} onChange={(e) => setContact(e.target.value)} className="input" /></Field>
        <Field label="Proveedor"><input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input" /></Field>
        <Field label="Estado">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </Field>
      </div>

      <div>
        <p className="label">Ítems (modelo / talle / cantidad)</p>
        <div className="space-y-2">
          {items.map((it, idx) => {
            const free = freeStock(it.product, it.size);
            let hint: { text: string; cls: string } | null = null;
            if (it.product.trim() && it.quantity > 0 && free !== null) {
              if (free >= it.quantity) {
                hint = { text: `✓ Tenés stock para cubrirlo (${free} disp. de pedidos al proveedor).`, cls: 'text-green-700' };
              } else {
                const have = Math.max(0, free);
                const faltan = it.quantity - have;
                hint = {
                  text: have > 0 ? `Tenés ${have} disp.; pedí ${faltan} más al proveedor.` : `No tenés stock: pedí ${faltan} al proveedor.`,
                  cls: 'text-amber-700',
                };
              }
            }
            return (
              <div key={idx} className="rounded-xl border border-navy/10 p-2">
                {catalog.length > 0 && (
                  <select
                    value={it.variant_id}
                    onChange={(e) => selectVariant(idx, e.target.value)}
                    className="input !py-1.5 mb-2"
                  >
                    <option value="">Producto manual (no afecta el stock web)</option>
                    {catalog.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                )}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-12 sm:items-end">
                  <label className="col-span-2 text-xs sm:col-span-4">
                    <span className="text-[11px] text-navy/50">Modelo</span>
                    <input value={it.product} onChange={(e) => updateItem(idx, { product: e.target.value })} className="input !py-1.5" placeholder="Titular 2026" />
                  </label>
                  <label className="text-xs sm:col-span-1">
                    <span className="text-[11px] text-navy/50">Talle</span>
                    <input value={it.size} onChange={(e) => updateItem(idx, { size: e.target.value })} className="input !py-1.5" placeholder="M" />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    <span className="text-[11px] text-navy/50">Cant.</span>
                    <input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} className="input !py-1.5" />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    <span className="text-[11px] text-navy/50">Precio U.</span>
                    <input type="number" min="0" value={it.sale_price} onChange={(e) => updateItem(idx, { sale_price: Number(e.target.value) })} className="input !py-1.5" />
                  </label>
                  <label className="text-xs sm:col-span-2">
                    <span className="text-[11px] text-navy/50">Costo U.</span>
                    <input type="number" min="0" value={it.unit_cost} onChange={(e) => updateItem(idx, { unit_cost: Number(e.target.value) })} className="input !py-1.5" />
                  </label>
                  <div className="col-span-2 flex justify-end sm:col-span-1">
                    <button type="button" onClick={() => setItems((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p))} className="text-xs font-semibold text-red-600">Quitar</button>
                  </div>
                </div>
                {hint && <p className={`mt-1 text-xs font-medium ${hint.cls}`}>{hint.text}</p>}
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => setItems((p) => [...p, { ...emptyItem }])} className="mt-2 text-sm font-semibold text-navy hover:underline">
          + Agregar ítem
        </button>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-cream-soft p-3 text-sm">
        <span className="text-navy/60">Venta: <b className="text-navy">{formatPrice(total)}</b></span>
        <span className="text-navy/60">Costo: <b className="text-navy">{formatPrice(cost)}</b></span>
        <span className="text-navy/60">
          Ganancia: <b className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>{formatPrice(margin)}</b>
          {total > 0 && <span className="text-navy/40"> ({((margin / total) * 100).toFixed(0)}%)</span>}
        </span>
      </div>

      <div>
        <p className="label">Cobro</p>
        <div className="flex flex-wrap gap-2">
          {([
            { v: 'unpaid', label: 'Sin pagar' },
            { v: 'deposit', label: 'Seña (50%)' },
            { v: 'paid', label: 'Pagado' },
          ] as const).map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => setPayment(o.v)}
              className={`badge ${payment === o.v ? 'bg-navy text-white' : 'border border-navy/20 text-navy/60'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {payment === 'deposit' && total > 0 && (
          <p className="mt-1 text-xs font-medium text-navy/60">
            Seña a cobrar: <b className="text-navy">{formatPrice(total / 2)}</b> · resta {formatPrice(total / 2)}
          </p>
        )}
      </div>

      <Field label="Notas">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-16" />
      </Field>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="btn-primary">
          {busy ? 'Guardando…' : encargo ? 'Guardar cambios' : 'Agregar encargo'}
        </button>
        {onCancel && <button onClick={onCancel} className="btn-outline">Cancelar</button>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
