'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createSupplierOrder, updateSupplierOrder, deleteSupplierOrder } from './supplier-actions';
import { formatPrice } from '@/lib/utils';

interface CatalogVariant {
  id: string;
  productName: string;
  size: string | null;
  label: string;
}

export function SupplierOrders({ orders, catalog = [] }: { orders: any[]; catalog?: CatalogVariant[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [variantId, setVariantId] = useState('');
  const [product, setProduct] = useState('');
  const [size, setSize] = useState('');

  function selectVariant(id: string) {
    setVariantId(id);
    if (id) {
      const v = catalog.find((c) => c.id === id);
      setProduct(v?.productName || '');
      setSize(v?.size || '');
    }
  }

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await createSupplierOrder(fd);
      formRef.current?.reset();
      setVariantId('');
      setProduct('');
      setSize('');
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
          {catalog.length > 0 && (
            <label className="col-span-2 text-xs sm:col-span-12">
              <span className="text-[11px] text-navy/50">Producto web (suma stock al recibir)</span>
              <select value={variantId} onChange={(e) => selectVariant(e.target.value)} className="input !py-1.5">
                <option value="">Producto manual (no afecta stock web)</option>
                {catalog.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
          )}
          <input type="hidden" name="variant_id" value={variantId} />
          <label className="col-span-2 text-xs sm:col-span-3">
            <span className="text-[11px] text-navy/50">Modelo *</span>
            <input name="product" required value={product} onChange={(e) => setProduct(e.target.value)} className="input !py-1.5" placeholder="Titular 2026" />
          </label>
          <label className="text-xs sm:col-span-1">
            <span className="text-[11px] text-navy/50">Talle</span>
            <input name="size" value={size} onChange={(e) => setSize(e.target.value)} className="input !py-1.5" placeholder="M" />
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="text-[11px] text-navy/50">Cantidad</span>
            <input name="quantity" type="number" min="1" defaultValue={1} className="input !py-1.5" />
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="text-[11px] text-navy/50">Costo U. (producto)</span>
            <input name="unit_cost" type="number" min="0" className="input !py-1.5" placeholder="13000" />
          </label>
          <label className="text-xs sm:col-span-2">
            <span className="text-[11px] text-navy/50">Envío del pedido</span>
            <input name="shipping_cost" type="number" min="0" className="input !py-1.5" placeholder="10000" />
          </label>
          <label className="col-span-2 text-xs sm:col-span-2">
            <span className="text-[11px] text-navy/50">Proveedor</span>
            <input name="supplier" className="input !py-1.5" />
          </label>
          <input type="hidden" name="status" value="pedido" />
          <p className="col-span-2 text-[11px] text-navy/50 sm:col-span-12">
            El envío se reparte entre las unidades. Costo unitario real = costo + envío/cantidad. Ese costo se autocompleta al cargar un encargo de este producto.
          </p>
          <div className="col-span-2 flex gap-2 sm:col-span-12">
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
                <th className="py-2 text-right">Envío</th>
                <th className="py-2 text-right">Costo U. real</th>
                <th className="py-2">Proveedor</th>
                <th className="py-2 text-center">Estado</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const real = Number(o.unit_cost) + (Number(o.shipping_cost || 0) / (o.quantity || 1));
                return (
                <tr key={o.id} className="border-t border-navy/5">
                  <td className="py-2 font-medium">{o.product}</td>
                  <td className="py-2">{o.size || '—'}</td>
                  <td className="py-2 text-center">{o.quantity}</td>
                  <td className="py-2 text-right">{o.unit_cost ? formatPrice(o.unit_cost) : '—'}</td>
                  <td className="py-2 text-right text-navy/60">{o.shipping_cost ? formatPrice(o.shipping_cost) : '—'}</td>
                  <td className="py-2 text-right font-semibold">{formatPrice(real)}</td>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
