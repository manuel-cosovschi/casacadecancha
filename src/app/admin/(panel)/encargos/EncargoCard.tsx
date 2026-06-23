'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateEncargo, deleteEncargo, exchangeEncargoItem, setExchangeStatus } from './actions';
import { EncargoForm, type MatrixRow, type CatalogVariant } from './EncargoForm';
import { formatPrice } from '@/lib/utils';

const STATUS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_camino', label: 'En camino' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
];
const STATUS_STYLE: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  en_camino: 'bg-blue-100 text-blue-800',
  entregado: 'bg-green-100 text-green-800',
  cancelado: 'bg-navy/10 text-navy/60',
};

export function EncargoCard({ e, matrix, catalog }: { e: any; matrix: MatrixRow[]; catalog: CatalogVariant[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [pending, start] = useTransition();

  const items: any[] = e.items ?? [];
  const total = items.reduce((a, i) => a + Number(i.sale_price) * i.quantity, 0);
  const cost = items.reduce((a, i) => a + Number(i.unit_cost) * i.quantity, 0);
  const margin = total - cost;
  const units = items.reduce((a, i) => a + i.quantity, 0);
  const payment: 'unpaid' | 'deposit' | 'paid' = e.payment_status ?? (e.paid ? 'paid' : 'unpaid');
  const collected = payment === 'paid' ? total : payment === 'deposit' ? Math.min(Number(e.paid_amount) || 0, total) : 0;

  function patch(p: Record<string, unknown>) {
    start(async () => {
      await updateEncargo(e.id, p);
      router.refresh();
    });
  }

  async function onDelete() {
    if (!confirm('¿Eliminar este encargo?')) return;
    await deleteEncargo(e.id);
    router.refresh();
  }

  function toggleExchange(id: string, status: 'pendiente' | 'hecho') {
    start(async () => {
      await setExchangeStatus(id, status === 'hecho' ? 'pendiente' : 'hecho');
      router.refresh();
    });
  }

  const exchanges: any[] = e.exchanges ?? [];

  if (editing) {
    return <EncargoForm encargo={e} matrix={matrix} catalog={catalog} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />;
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-navy">{e.customer_name}</p>
          {e.contact && <p className="text-xs text-navy/50">{e.contact}</p>}
        </div>
        <span className={`badge ${STATUS_STYLE[e.status] || 'bg-navy/10 text-navy'}`}>
          {STATUS.find((s) => s.value === e.status)?.label || e.status}
        </span>
      </div>

      <ul className="mt-3 divide-y divide-navy/5 rounded-xl bg-cream-soft/60 px-3">
        {items.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <span className="text-navy/80">
              <b className="text-navy">{i.quantity}×</b> {i.product}
              {i.size ? <span className="text-navy/50"> · Talle {i.size}</span> : ''}
            </span>
            <span className="shrink-0 font-medium text-navy/70">{formatPrice(Number(i.sale_price) * i.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span className="text-navy/60">{units} u.</span>
        <span className="text-navy/60">Venta: <b className="text-navy">{formatPrice(total)}</b></span>
        <span className="text-navy/60">
          Ganancia: <b className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>{formatPrice(margin)}</b>
          {total > 0 && <span className="text-navy/40"> ({((margin / total) * 100).toFixed(0)}%)</span>}
        </span>
        {e.supplier && <span className="text-navy/60">Proveedor: <b className="text-navy">{e.supplier}</b></span>}
        {payment !== 'unpaid' && (
          <span className="text-navy/60">
            Cobrado: <b className="text-green-600">{formatPrice(collected)}</b>
            {payment === 'deposit' && <span className="text-amber-600"> · resta {formatPrice(total - collected)}</span>}
          </span>
        )}
      </div>

      {exchanges.length > 0 && (
        <div className="mt-3 space-y-1.5 rounded-xl border border-celeste/30 bg-celeste/10 p-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy/50">Cambios</p>
          {exchanges.map((x) => {
            const done = x.status === 'hecho';
            return (
              <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-navy/80">
                  {x.quantity}× {x.old_product}{x.old_size ? ` ${x.old_size}` : ''} → <b>{x.new_product}{x.new_size ? ` ${x.new_size}` : ''}</b>
                </span>
                <button
                  onClick={() => toggleExchange(x.id, x.status)}
                  disabled={pending}
                  className={`badge ${done ? 'bg-green-100 text-green-800' : 'border border-amber-300 text-amber-700'}`}
                >
                  {done ? '✓ Hecho' : '⏳ Lo tengo que hacer'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-navy/10 pt-3">
        <select
          value={payment}
          onChange={(ev) => patch({ payment_status: ev.target.value })}
          disabled={pending}
          className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
            payment === 'paid'
              ? 'border-green-300 bg-green-100 text-green-800'
              : payment === 'deposit'
                ? 'border-amber-300 bg-amber-50 text-amber-700'
                : 'border-navy/20 text-navy/60'
          }`}
        >
          <option value="unpaid">Sin pagar</option>
          <option value="deposit">Seña / parcial</option>
          <option value="paid">✓ Pagado</option>
        </select>
        {payment === 'deposit' && (
          <DepositField id={e.id} initial={collected} total={total} disabled={pending} onSaved={() => router.refresh()} />
        )}
        <select
          value={e.status}
          onChange={(ev) => patch({ status: ev.target.value })}
          disabled={pending}
          className="rounded-lg border border-navy/20 px-2 py-1 text-xs font-semibold"
        >
          {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={() => setExchanging((v) => !v)} className="ml-auto text-sm font-semibold text-navy hover:underline">Cambio</button>
        <button onClick={() => setEditing(true)} className="text-sm font-semibold text-navy hover:underline">Editar</button>
        <button onClick={onDelete} className="text-sm font-semibold text-red-600 hover:underline">Eliminar</button>
      </div>

      {exchanging && (
        <ExchangePanel
          encargoId={e.id}
          items={items}
          catalog={catalog}
          matrix={matrix}
          onClose={() => setExchanging(false)}
        />
      )}
    </div>
  );
}

function ExchangePanel({
  encargoId,
  items,
  catalog,
  matrix,
  onClose,
}: {
  encargoId: string;
  items: any[];
  catalog: CatalogVariant[];
  matrix: MatrixRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string>(items[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState('');
  const [product, setProduct] = useState('');
  const [size, setSize] = useState('');
  const [unitCost, setUnitCost] = useState<number | null>(null);
  const [status, setStatus] = useState<'pendiente' | 'hecho'>('pendiente');

  const selectedItem = items.find((i) => i.id === itemId) || items[0];

  // Stock libre del modelo/talle NUEVO (para avisar si se puede o hay que pedir).
  let hint: { text: string; cls: string } | null = null;
  if (product.trim() && qty > 0) {
    const key = `${product.trim().toLowerCase()}|${(size || '').trim().toLowerCase()}`;
    const m = matrix.find((r) => r.key === key);
    const free = m ? (m.ordered || 0) + (m.adjusted || 0) - (m.gifted || 0) - (m.reserved || 0) : 0;
    if (free >= qty) {
      hint = { text: `✓ Tenés stock para el cambio (${free} disp.).`, cls: 'text-green-700' };
    } else {
      const have = Math.max(0, free);
      const faltan = qty - have;
      hint = {
        text: have > 0 ? `Tenés ${have}; pedí ${faltan} más al proveedor.` : `No tenés stock: pedí ${faltan} al proveedor.`,
        cls: 'text-amber-700',
      };
    }
  }

  function selectVariant(id: string) {
    setVariantId(id);
    if (id) {
      const v = catalog.find((c) => c.id === id);
      setProduct(v?.productName || '');
      setSize(v?.size || '');
      setUnitCost(v?.cost && v.cost > 0 ? Math.round(v.cost) : null);
    }
  }

  function submit() {
    if (!product.trim()) {
      setError('Elegí el nuevo modelo/talle.');
      return;
    }
    start(async () => {
      const res = await exchangeEncargoItem({
        encargoId,
        itemId: selectedItem.id,
        quantity: qty,
        newProduct: product,
        newSize: size,
        newVariantId: variantId || null,
        newUnitCost: unitCost,
        status,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="mt-3 rounded-xl border border-celeste/40 bg-celeste/10 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-navy/60">Registrar cambio</p>
      <p className="mb-2 text-[11px] text-navy/50">Lo que se cambia vuelve a stock disponible y lo nuevo queda reservado, todo automático.</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-12 sm:items-end">
        <label className="col-span-2 text-xs sm:col-span-5">
          <span className="text-[11px] text-navy/50">Ítem a cambiar</span>
          <select value={itemId} onChange={(ev) => { setItemId(ev.target.value); setQty(1); }} className="input !py-1.5">
            {items.map((i) => (
              <option key={i.id} value={i.id}>{i.quantity}× {i.product}{i.size ? ` · ${i.size}` : ''}</option>
            ))}
          </select>
        </label>
        <label className="text-xs sm:col-span-2">
          <span className="text-[11px] text-navy/50">Cant.</span>
          <input type="number" min={1} max={selectedItem?.quantity || 1} value={qty} onChange={(ev) => setQty(Number(ev.target.value))} className="input !py-1.5" />
        </label>
      </div>

      <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-navy/40">Cambiar por</p>
      {catalog.length > 0 && (
        <select value={variantId} onChange={(ev) => selectVariant(ev.target.value)} className="input !py-1.5 mt-1">
          <option value="">Producto manual (no afecta stock web)</option>
          {catalog.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-12 sm:items-end">
        <label className="col-span-2 text-xs sm:col-span-7">
          <span className="text-[11px] text-navy/50">Modelo *</span>
          <input value={product} onChange={(ev) => setProduct(ev.target.value)} className="input !py-1.5" placeholder="Titular 2026" />
        </label>
        <label className="text-xs sm:col-span-3">
          <span className="text-[11px] text-navy/50">Talle</span>
          <input value={size} onChange={(ev) => setSize(ev.target.value)} className="input !py-1.5" placeholder="M" />
        </label>
      </div>

      {hint && <p className={`mt-2 text-xs font-medium ${hint.cls}`}>{hint.text}</p>}

      <div className="mt-2">
        <span className="text-[11px] text-navy/50">¿El cambio ya lo hiciste?</span>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={() => setStatus('pendiente')}
            className={`badge ${status === 'pendiente' ? 'bg-navy text-white' : 'border border-navy/20 text-navy/60'}`}
          >
            ⏳ Lo tengo que hacer
          </button>
          <button
            type="button"
            onClick={() => setStatus('hecho')}
            className={`badge ${status === 'hecho' ? 'bg-navy text-white' : 'border border-navy/20 text-navy/60'}`}
          >
            ✓ Ya lo hice
          </button>
        </div>
      </div>

      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={submit} disabled={pending} className="btn-primary !py-2">Confirmar cambio</button>
        <button onClick={onClose} className="btn-outline !py-2">Cancelar</button>
      </div>
    </div>
  );
}

/** Campo para editar cuánto se cobró (seña / pago parcial) de un encargo. */
function DepositField({
  id,
  initial,
  total,
  disabled,
  onSaved,
}: {
  id: string;
  initial: number;
  total: number;
  disabled?: boolean;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(initial);
  const [saving, startSave] = useTransition();

  function save() {
    const v = Math.max(0, Math.min(amount, total));
    if (v === initial) return;
    startSave(async () => {
      await updateEncargo(id, { paid_amount: v });
      onSaved();
    });
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-navy/60">
      Cobrado $
      <input
        type="number"
        min={0}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        disabled={disabled || saving}
        className="w-24 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 font-semibold text-amber-700"
      />
      <span className="text-navy/40">/ {formatPrice(total)}</span>
    </span>
  );
}
