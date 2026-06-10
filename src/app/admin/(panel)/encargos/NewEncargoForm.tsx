'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveEncargo } from './actions';

export function NewEncargoForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    await saveEncargo(new FormData(e.currentTarget));
    setBusy(false);
    formRef.current?.reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Nuevo encargo
      </button>
    );
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card space-y-3 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Nuevo encargo</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <F label="Cliente *"><input name="customer_name" className="input" required /></F>
        <F label="Contacto (WhatsApp)"><input name="contact" className="input" /></F>
        <F label="Producto *"><input name="product" className="input" placeholder="Ej: Camiseta Argentina Titular" required /></F>
        <F label="Talle"><input name="size" className="input" placeholder="M" /></F>
        <F label="Cantidad"><input name="quantity" type="number" min="1" defaultValue={1} className="input" /></F>
        <F label="Proveedor"><input name="supplier" className="input" /></F>
        <F label="Precio de venta (unitario)"><input name="sale_price" type="number" min="0" className="input" /></F>
        <F label="Costo (unitario)"><input name="unit_cost" type="number" min="0" className="input" /></F>
        <F label="Estado">
          <select name="status" className="input" defaultValue="pendiente">
            <option value="pendiente">Pendiente</option>
            <option value="en_camino">En camino</option>
            <option value="entregado">Entregado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </F>
        <F label="Notas" full><textarea name="notes" className="input min-h-16" /></F>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="supplier_ordered" className="h-4 w-4" /> Ya lo pedí al proveedor</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="paid" className="h-4 w-4" /> Ya me pagaron</label>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Guardando…' : 'Agregar encargo'}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline">Cancelar</button>
      </div>
    </form>
  );
}

function F({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block text-xs ${full ? 'sm:col-span-2 lg:col-span-3' : ''}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
