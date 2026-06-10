'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveEncargo, updateEncargo, deleteEncargo } from './actions';
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

export function EncargoCard({ e }: { e: any }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();

  const margin = (Number(e.sale_price) - Number(e.unit_cost)) * e.quantity;
  const marginPct = e.sale_price > 0 ? (margin / (e.sale_price * e.quantity)) * 100 : 0;

  function patch(p: Record<string, unknown>) {
    start(async () => {
      await updateEncargo(e.id, p);
      router.refresh();
    });
  }

  async function onSave(formData: FormData) {
    await saveEncargo(formData);
    setEditing(false);
    router.refresh();
  }

  async function onDelete() {
    if (!confirm('¿Eliminar este encargo?')) return;
    await deleteEncargo(e.id);
    router.refresh();
  }

  if (editing) {
    return (
      <form action={onSave} className="card space-y-3 p-4">
        <input type="hidden" name="id" value={e.id} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cliente"><input name="customer_name" defaultValue={e.customer_name} className="input" required /></Field>
          <Field label="Contacto (WhatsApp)"><input name="contact" defaultValue={e.contact ?? ''} className="input" /></Field>
          <Field label="Producto"><input name="product" defaultValue={e.product} className="input" required /></Field>
          <Field label="Talle"><input name="size" defaultValue={e.size ?? ''} className="input" /></Field>
          <Field label="Cantidad"><input name="quantity" type="number" min="1" defaultValue={e.quantity} className="input" /></Field>
          <Field label="Proveedor"><input name="supplier" defaultValue={e.supplier ?? ''} className="input" /></Field>
          <Field label="Precio de venta (unitario)"><input name="sale_price" type="number" min="0" defaultValue={e.sale_price} className="input" /></Field>
          <Field label="Costo (unitario)"><input name="unit_cost" type="number" min="0" defaultValue={e.unit_cost} className="input" /></Field>
          <Field label="Estado">
            <select name="status" defaultValue={e.status} className="input">
              {STATUS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="supplier_ordered" defaultChecked={e.supplier_ordered} className="h-4 w-4" /> Pedido al proveedor</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="paid" defaultChecked={e.paid} className="h-4 w-4" /> Pagado</label>
          </div>
          <Field label="Notas" full><textarea name="notes" defaultValue={e.notes ?? ''} className="input min-h-16" /></Field>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary">Guardar</button>
          <button type="button" onClick={() => setEditing(false)} className="btn-outline">Cancelar</button>
          <button type="button" onClick={onDelete} className="ml-auto text-sm font-semibold text-red-600 hover:underline">Eliminar</button>
        </div>
      </form>
    );
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold text-navy">{e.customer_name}</p>
          <p className="text-sm text-navy/70">
            {e.product}
            {e.size ? ` · Talle ${e.size}` : ''} · x{e.quantity}
          </p>
          {e.contact && <p className="text-xs text-navy/50">{e.contact}</p>}
        </div>
        <span className={`badge ${STATUS_STYLE[e.status] || 'bg-navy/10 text-navy'}`}>
          {STATUS.find((s) => s.value === e.status)?.label || e.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span className="text-navy/60">Venta: <b className="text-navy">{formatPrice(e.sale_price * e.quantity)}</b></span>
        <span className="text-navy/60">Costo: <b className="text-navy">{formatPrice(e.unit_cost * e.quantity)}</b></span>
        <span className="text-navy/60">
          Ganancia: <b className={margin >= 0 ? 'text-green-600' : 'text-red-600'}>{formatPrice(margin)}</b>
          {e.sale_price > 0 && <span className="text-navy/40"> ({marginPct.toFixed(0)}%)</span>}
        </span>
        {e.supplier && <span className="text-navy/60">Proveedor: <b className="text-navy">{e.supplier}</b></span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-navy/10 pt-3">
        <button
          onClick={() => patch({ supplier_ordered: !e.supplier_ordered })}
          disabled={pending}
          className={`badge ${e.supplier_ordered ? 'bg-green-100 text-green-800' : 'border border-navy/20 text-navy/60'}`}
        >
          {e.supplier_ordered ? '✓ Pedido al proveedor' : 'Pedir al proveedor'}
        </button>
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
        <button onClick={() => setEditing(true)} className="ml-auto text-sm font-semibold text-navy hover:underline">
          Editar
        </button>
      </div>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block text-xs ${full ? 'sm:col-span-2' : ''}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
