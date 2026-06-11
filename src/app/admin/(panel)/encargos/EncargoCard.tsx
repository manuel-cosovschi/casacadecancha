'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateEncargo, deleteEncargo, updateItemOrdered } from './actions';
import { EncargoForm, type MatrixRow } from './EncargoForm';
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

export function EncargoCard({ e, matrix }: { e: any; matrix: MatrixRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  const items: any[] = e.items ?? [];
  const total = items.reduce((a, i) => a + Number(i.sale_price) * i.quantity, 0);
  const cost = items.reduce((a, i) => a + Number(i.unit_cost) * i.quantity, 0);
  const margin = total - cost;
  const units = items.reduce((a, i) => a + i.quantity, 0);
  const allOrdered = items.length > 0 && items.every((i) => (i.ordered_qty || 0) >= i.quantity);

  function patch(p: Record<string, unknown>) {
    start(async () => {
      await updateEncargo(e.id, p);
      router.refresh();
    });
  }

  function setOrdered(itemId: string, n: number) {
    start(async () => {
      await updateItemOrdered(itemId, n);
      router.refresh();
    });
  }

  async function onDelete() {
    if (!confirm('¿Eliminar este encargo?')) return;
    await deleteEncargo(e.id);
    router.refresh();
  }

  if (editing) {
    return <EncargoForm encargo={e} matrix={matrix} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />;
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

      {/* Ítems con reservado / pedido */}
      <ul className="mt-3 space-y-1.5 rounded-xl bg-cream-soft/60 p-3">
        {items.map((i) => {
          const ord = i.ordered_qty || 0;
          const falta = i.quantity - ord;
          return (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-navy/80">
                <b className="text-navy">{i.quantity}×</b> {i.product}
                {i.size ? <span className="text-navy/50"> · Talle {i.size}</span> : ''}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-navy/55">Pedido:</span>
                <input
                  type="number"
                  min="0"
                  defaultValue={ord}
                  onBlur={(ev) => {
                    const n = Number(ev.target.value);
                    if (n !== ord) setOrdered(i.id, n);
                  }}
                  disabled={pending}
                  className="w-14 rounded-lg border border-navy/20 px-2 py-1 text-xs"
                />
                {falta > 0 ? (
                  <span className="badge bg-amber-100 text-amber-800">Faltan {falta}</span>
                ) : ord > i.quantity ? (
                  <span className="badge bg-blue-100 text-blue-800">+{ord - i.quantity}</span>
                ) : (
                  <span className="badge bg-green-100 text-green-800">OK</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span className="text-navy/60">{units} u.</span>
        <span className="text-navy/60">Venta: <b className="text-navy">{formatPrice(total)}</b></span>
        <span className="text-navy/60">
          Ganancia: <b className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>{formatPrice(margin)}</b>
          {total > 0 && <span className="text-navy/40"> ({((margin / total) * 100).toFixed(0)}%)</span>}
        </span>
        {e.supplier && <span className="text-navy/60">Proveedor: <b className="text-navy">{e.supplier}</b></span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-navy/10 pt-3">
        <span className={`badge ${allOrdered ? 'bg-green-100 text-green-800' : 'border border-amber-300 text-amber-700'}`}>
          {allOrdered ? '✓ Pedido completo' : 'Pedido incompleto'}
        </span>
        <button
          onClick={() => patch({ paid: !e.paid })}
          disabled={pending}
          className={`badge ${e.paid ? 'bg-green-100 text-green-800' : 'border border-navy/20 text-navy/60'}`}
        >
          {e.paid ? '✓ Pagado' : 'Sin pagar'}
        </button>
        <select
          value={e.status}
          onChange={(ev) => patch({ status: ev.target.value })}
          disabled={pending}
          className="rounded-lg border border-navy/20 px-2 py-1 text-xs font-semibold"
        >
          {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={() => setEditing(true)} className="ml-auto text-sm font-semibold text-navy hover:underline">Editar</button>
        <button onClick={onDelete} className="text-sm font-semibold text-red-600 hover:underline">Eliminar</button>
      </div>
    </div>
  );
}
