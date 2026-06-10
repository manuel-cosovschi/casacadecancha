'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveVariant, deleteVariant } from './actions';
import { availableStock, formatPrice } from '@/lib/utils';

export function VariantsManager({
  productId,
  variants,
}: {
  productId: string;
  variants: any[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleSave(formData: FormData) {
    setBusy(true);
    await saveVariant(formData);
    setBusy(false);
    router.refresh();
    const form = document.getElementById('new-variant-form') as HTMLFormElement | null;
    form?.reset();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta variante?')) return;
    await deleteVariant(id);
    router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">
        Variantes / Talles
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-navy/50">
              <th className="py-2">Talle</th>
              <th className="py-2">SKU</th>
              <th className="py-2">Stock</th>
              <th className="py-2">Mín.</th>
              <th className="py-2">Disp.</th>
              <th className="py-2">Costo</th>
              <th className="py-2">Estado</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} className="border-t border-navy/5">
                <td className="py-2">
                  <form action={handleSave} className="contents">
                    <input type="hidden" name="id" value={v.id} />
                    <input type="hidden" name="product_id" value={productId} />
                    <input name="size" defaultValue={v.size ?? ''} className="input !py-1 w-16" />
                  </form>
                </td>
                <td className="py-2 text-navy/60">{v.sku || '—'}</td>
                <td className="py-2">{v.stock_physical}</td>
                <td className="py-2">{v.stock_minimum}</td>
                <td className="py-2">
                  <span className={availableStock(v) <= 0 ? 'text-red-600' : ''}>
                    {availableStock(v)}
                  </span>
                </td>
                <td className="py-2">{v.variant_cost ? formatPrice(v.variant_cost) : '—'}</td>
                <td className="py-2">{v.active ? '✓' : '✗'}</td>
                <td className="py-2 text-right">
                  <button onClick={() => handleDelete(v.id)} className="text-xs text-red-600 hover:underline">
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Nueva variante */}
      <form id="new-variant-form" action={handleSave} className="mt-4 flex flex-wrap items-end gap-2 border-t border-navy/10 pt-4">
        <input type="hidden" name="product_id" value={productId} />
        <label className="text-xs">
          <span className="label">Talle</span>
          <input name="size" className="input !py-1.5 w-20" placeholder="M" />
        </label>
        <label className="text-xs">
          <span className="label">SKU</span>
          <input name="sku" className="input !py-1.5 w-32" />
        </label>
        <label className="text-xs">
          <span className="label">Stock</span>
          <input name="stock_physical" type="number" min="0" defaultValue={0} className="input !py-1.5 w-20" />
        </label>
        <label className="text-xs">
          <span className="label">Mínimo</span>
          <input name="stock_minimum" type="number" min="0" defaultValue={0} className="input !py-1.5 w-20" />
        </label>
        <label className="text-xs">
          <span className="label">Costo</span>
          <input name="variant_cost" type="number" min="0" className="input !py-1.5 w-24" />
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-xs">
          <input type="checkbox" name="active" defaultChecked className="h-4 w-4" /> Activo
        </label>
        <button type="submit" disabled={busy} className="btn-primary !py-2">
          + Agregar
        </button>
      </form>
      <p className="mt-2 text-xs text-navy/50">
        Para editar el talle de una fila existente, modificá el campo y presioná Enter.
      </p>
    </div>
  );
}
