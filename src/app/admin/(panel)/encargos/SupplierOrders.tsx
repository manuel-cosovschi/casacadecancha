'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createSupplierBatch,
  updateSupplierBatch,
  setSupplierBatchStatus,
  deleteSupplierBatch,
  type SupplierItemInput,
} from './supplier-actions';
import { formatPrice } from '@/lib/utils';

interface CatalogVariant {
  id: string;
  productName: string;
  size: string | null;
  label: string;
  cost?: number;
}

interface Item {
  product: string;
  size: string;
  quantity: number;
  unit_cost: number;
  variant_id: string;
}

interface Batch {
  batch_id: string;
  supplier: string | null;
  status: string;
  shipping_cost: number;
  total_qty: number;
  total_cost: number;
  items: {
    id: string;
    product: string;
    size: string | null;
    quantity: number;
    unit_cost: number;
    shipping_cost: number;
    variant_id: string | null;
  }[];
}

const emptyItem: Item = { product: '', size: '', quantity: 1, unit_cost: 0, variant_id: '' };

export function SupplierOrders({ batches = [], catalog = [] }: { batches?: Batch[]; catalog?: CatalogVariant[] }) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Pedidos al proveedor</h2>
          <p className="text-xs text-navy/50">Lo que comprás al proveedor. Un pedido puede tener varios productos/talles.</p>
        </div>
        {!open && !editingId && (
          <button onClick={() => setOpen(true)} className="btn-primary !py-2">+ Nuevo pedido</button>
        )}
      </div>

      {open && (
        <BatchForm catalog={catalog} onClose={() => setOpen(false)} />
      )}

      {batches.length > 0 && (
        <div className="mt-4 space-y-3">
          {batches.map((b) =>
            editingId === b.batch_id ? (
              <BatchForm key={b.batch_id} catalog={catalog} batch={b} onClose={() => setEditingId(null)} />
            ) : (
              <BatchCard key={b.batch_id} b={b} onEdit={() => setEditingId(b.batch_id)} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function BatchCard({ b, onEdit }: { b: Batch; onEdit: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const received = b.status === 'recibido';

  function toggle() {
    start(async () => {
      await setSupplierBatchStatus(b.batch_id, received ? 'pedido' : 'recibido');
      router.refresh();
    });
  }
  function remove() {
    if (!confirm('¿Eliminar este pedido al proveedor?')) return;
    start(async () => {
      await deleteSupplierBatch(b.batch_id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-navy/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-semibold text-navy">{b.supplier || 'Proveedor sin nombre'}</span>
          <span className="text-navy/50"> · {b.total_qty} u. · {formatPrice(b.total_cost)}</span>
          {b.shipping_cost > 0 && <span className="text-navy/40"> (envío {formatPrice(b.shipping_cost)})</span>}
        </div>
        <span className={`badge ${received ? 'bg-green-100 text-green-800' : 'border border-amber-300 text-amber-700'}`}>
          {received ? '✓ Recibido' : 'En camino'}
        </span>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-sm">
          <thead>
            <tr className="text-left text-navy/50">
              <th className="py-1">Modelo</th>
              <th className="py-1">Talle</th>
              <th className="py-1 text-center">Cant.</th>
              <th className="py-1 text-right">Costo U.</th>
              <th className="py-1 text-right">Costo U. real</th>
            </tr>
          </thead>
          <tbody>
            {b.items.map((i) => {
              const real = Number(i.unit_cost) + Number(i.shipping_cost || 0) / (i.quantity || 1);
              return (
                <tr key={i.id} className="border-t border-navy/5">
                  <td className="py-1 font-medium">{i.product}</td>
                  <td className="py-1">{i.size || '—'}</td>
                  <td className="py-1 text-center">{i.quantity}</td>
                  <td className="py-1 text-right">{i.unit_cost ? formatPrice(i.unit_cost) : '—'}</td>
                  <td className="py-1 text-right font-semibold">{formatPrice(real)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-navy/10 pt-2">
        <button onClick={toggle} disabled={pending} className="text-xs font-semibold text-navy hover:underline">
          {received ? 'Marcar en camino' : 'Marcar recibido'}
        </button>
        <button onClick={onEdit} disabled={pending} className="text-xs font-semibold text-navy hover:underline">Editar</button>
        <button onClick={remove} disabled={pending} className="ml-auto text-xs font-semibold text-red-600 hover:underline">Eliminar</button>
      </div>
    </div>
  );
}

function BatchForm({
  catalog,
  batch,
  onClose,
}: {
  catalog: CatalogVariant[];
  batch?: Batch;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [supplier, setSupplier] = useState(batch?.supplier ?? '');
  const [status, setStatus] = useState<'pedido' | 'recibido'>((batch?.status as any) === 'recibido' ? 'recibido' : 'pedido');
  const [shipping, setShipping] = useState<number>(batch?.shipping_cost ?? 0);
  const [items, setItems] = useState<Item[]>(
    batch?.items?.length
      ? batch.items.map((i) => ({
          product: i.product ?? '',
          size: i.size ?? '',
          quantity: i.quantity ?? 1,
          unit_cost: Number(i.unit_cost) || 0,
          variant_id: i.variant_id ?? '',
        }))
      : [{ ...emptyItem }],
  );

  const totalMerc = items.reduce((a, i) => a + i.unit_cost * i.quantity, 0);
  const totalQty = items.reduce((a, i) => a + (i.quantity || 0), 0);

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
    if (v?.cost && v.cost > 0) patch.unit_cost = Math.round(v.cost);
    updateItem(idx, patch);
  }

  function submit() {
    if (!items.some((i) => i.product.trim())) {
      setError('Agregá al menos un producto.');
      return;
    }
    setError(null);
    const payload = {
      supplier,
      status,
      shipping_cost: shipping,
      items: items
        .filter((i) => i.product.trim())
        .map<SupplierItemInput>((i) => ({
          product: i.product,
          size: i.size,
          quantity: i.quantity,
          unit_cost: i.unit_cost,
          variant_id: i.variant_id || null,
        })),
    };
    start(async () => {
      const res = batch ? await updateSupplierBatch(batch.batch_id, payload) : await createSupplierBatch(payload);
      if (res?.error) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="mt-3 rounded-xl border border-navy/10 p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:items-end">
        <label className="col-span-2 text-xs sm:col-span-2">
          <span className="text-[11px] text-navy/50">Proveedor</span>
          <input value={supplier} onChange={(e) => setSupplier(e.target.value)} className="input !py-1.5" placeholder="China G5" />
        </label>
        <label className="text-xs">
          <span className="text-[11px] text-navy/50">Envío del pedido</span>
          <input type="number" min="0" value={shipping} onChange={(e) => setShipping(Number(e.target.value))} className="input !py-1.5" placeholder="13000" />
        </label>
        <label className="text-xs">
          <span className="text-[11px] text-navy/50">Estado</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="input !py-1.5">
            <option value="pedido">En camino</option>
            <option value="recibido">Recibido</option>
          </select>
        </label>
      </div>

      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-navy/40">Productos del pedido</p>
      <div className="mt-1 space-y-2">
        {items.map((it, idx) => (
          <div key={idx} className="rounded-lg border border-navy/10 p-2">
            {catalog.length > 0 && (
              <select
                value={it.variant_id}
                onChange={(e) => selectVariant(idx, e.target.value)}
                className="input !py-1.5 mb-2"
              >
                <option value="">Producto manual (no afecta el stock web)</option>
                {catalog.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-12 sm:items-end">
              <label className="col-span-2 text-xs sm:col-span-5">
                <span className="text-[11px] text-navy/50">Modelo *</span>
                <input value={it.product} onChange={(e) => updateItem(idx, { product: e.target.value })} className="input !py-1.5" placeholder="Titular 2026" />
              </label>
              <label className="text-xs sm:col-span-2">
                <span className="text-[11px] text-navy/50">Talle</span>
                <input value={it.size} onChange={(e) => updateItem(idx, { size: e.target.value })} className="input !py-1.5" placeholder="M" />
              </label>
              <label className="text-xs sm:col-span-2">
                <span className="text-[11px] text-navy/50">Cant.</span>
                <input type="number" min="1" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} className="input !py-1.5" />
              </label>
              <label className="text-xs sm:col-span-2">
                <span className="text-[11px] text-navy/50">Costo U.</span>
                <input type="number" min="0" value={it.unit_cost} onChange={(e) => updateItem(idx, { unit_cost: Number(e.target.value) })} className="input !py-1.5" />
              </label>
              <div className="col-span-2 flex justify-end sm:col-span-1">
                <button type="button" onClick={() => setItems((p) => (p.length > 1 ? p.filter((_, i) => i !== idx) : p))} className="text-xs font-semibold text-red-600">Quitar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setItems((p) => [...p, { ...emptyItem }])} className="mt-2 text-sm font-semibold text-navy hover:underline">
        + Agregar producto
      </button>

      <p className="mt-3 text-[11px] text-navy/50">
        Mercadería {formatPrice(totalMerc)} + envío {formatPrice(shipping)} = <b className="text-navy">{formatPrice(totalMerc + shipping)}</b> · {totalQty} u.
        El envío se reparte por unidad para calcular el costo real.
      </p>

      {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button onClick={submit} disabled={pending} className="btn-primary !py-2">
          {pending ? 'Guardando…' : batch ? 'Guardar cambios' : 'Agregar pedido'}
        </button>
        <button type="button" onClick={onClose} className="btn-outline !py-2">Cancelar</button>
      </div>
    </div>
  );
}
