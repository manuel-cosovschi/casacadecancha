'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createSupplierOrder, updateSupplierOrder, deleteSupplierOrder } from './supplier-actions';
import { formatPrice } from '@/lib/utils';

export function SupplierOrders({ orders }: { orders: any[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await createSupplierOrder(fd);
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    });
  }

  function toggleReceived(o: any) {
    start(async () => {
      await updateSupplierOrder(o.id, { status: o.status === 'recibido' ? 'pedido' : 'recibido' });
      router.refresh();
    });
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este pedido al proveedor?')) return;
    await deleteSupplierOrder(id);
    router.refresh();
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Pedidos al proveedor</h2>
          <p className="text-xs text-navy/50">Lo que comprás al proveedor. Suma stock que se compara con los encargos.</p>
        </div>
        {!open && (
          <button onClick={() => setOpen(true)} className="btn-primary !py-2">+ Nuevo pedido</button>
        )}
      </div>

      {open && (
        <form ref={formRef} onSubmit={onCreate} className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-navy/10 p-3 sm:grid-cols-12 sm:items-end">
          <label className="col-span-2 text-xs sm:col-span-3">
            <span className="text-[11px] text-navy/50">Modelo *</span>
            <input name="product" required className="input !py-1.5" placeholder="Titular 2026" />
          </label>
          <label className="text-xs sm:col-span-1">
            <span className="text-[11px] text-navy/50">Talle</span>
            <input name="size" className="input !py-1.5" placeholder="M" />
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="text-[11px] text-navy/50">Cantidad</span>
            <input name="quantity" type="number" min="1" defaultValue={1} className="input !py-1.5" />
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="text-[11px] text-navy/50">Costo U.</span>
            <input name="unit_cost" type="number" min="0" className="input !py-1.5" />
          </label>
          <label className="col-span-2 text-xs sm:col-span-2">
            <span className="text-[11px] text-navy/50">Proveedor</span>
            <input name="supplier" className="input !py-1.5" />
          </label>
          <input type="hidden" name="status" value="pedido" />
          <div className="col-span-2 flex gap-2 sm:col-span-2">
            <button type="submit" disabled={pending} className="btn-primary !py-2">Agregar</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-outline !py-2">Cancelar</button>
          </div>
        </form>
      )}

      {orders.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-navy/50">
                <th className="py-2">Modelo</th>
                <th className="py-2">Talle</th>
                <th className="py-2 text-center">Cant.</th>
                <th className="py-2 text-right">Costo U.</th>
                <th className="py-2">Proveedor</th>
                <th className="py-2 text-center">Estado</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-navy/5">
                  <td className="py-2 font-medium">{o.product}</td>
                  <td className="py-2">{o.size || '—'}</td>
                  <td className="py-2 text-center">{o.quantity}</td>
                  <td className="py-2 text-right">{o.unit_cost ? formatPrice(o.unit_cost) : '—'}</td>
                  <td className="py-2 text-navy/70">{o.supplier || '—'}</td>
                  <td className="py-2 text-center">
                    <button
                      onClick={() => toggleReceived(o)}
                      disabled={pending}
                      className={`badge ${o.status === 'recibido' ? 'bg-green-100 text-green-800' : 'border border-amber-300 text-amber-700'}`}
                    >
                      {o.status === 'recibido' ? '✓ Recibido' : 'Pedido'}
                    </button>
                  </td>
                  <td className="py-2 text-right">
                    <button onClick={() => remove(o.id)} className="text-xs font-semibold text-red-600 hover:underline">Eliminar</button>
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
