'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateEncargo, deleteEncargo } from './actions';
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
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-navy/10 pt-3">
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
