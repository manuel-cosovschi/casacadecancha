'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { saveProduct, type ActionState } from './actions';

interface Category {
  id: string;
  name: string;
}

export function ProductForm({
  product,
  categories,
}: {
  product?: any;
  categories: Category[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    saveProduct,
    {},
  );

  useEffect(() => {
    if (state.ok && state.id && !product) {
      router.push(`/admin/productos/${state.id}`);
    }
  }, [state, product, router]);

  return (
    <form action={formAction} className="space-y-6">
      {product?.id && <input type="hidden" name="id" value={product.id} />}

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">Datos básicos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre *">
            <input name="name" defaultValue={product?.name} required className="input" />
          </Field>
          <Field label="Slug (URL)" hint="Se genera automático si lo dejás vacío">
            <input name="slug" defaultValue={product?.slug} className="input" />
          </Field>
          <Field label="Descripción corta" full>
            <input name="short_description" defaultValue={product?.short_description ?? ''} className="input" />
          </Field>
          <Field label="Descripción" full>
            <textarea name="description" defaultValue={product?.description ?? ''} className="input min-h-28" />
          </Field>
          <Field label="Categoría">
            <select name="category_id" defaultValue={product?.category_id ?? ''} className="input">
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Badge">
            <select name="badge" defaultValue={product?.badge ?? ''} className="input">
              <option value="">Ninguno</option>
              {['Nuevo', 'Oferta', 'Más vendido', 'Últimos talles', 'Niños'].map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">Precios y costos</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Precio *">
            <input name="price" type="number" min="0" step="1" defaultValue={product?.price ?? ''} required className="input" />
          </Field>
          <Field label="Precio anterior">
            <input name="compare_at_price" type="number" min="0" step="1" defaultValue={product?.compare_at_price ?? ''} className="input" />
          </Field>
          <Field label="Costo unitario">
            <input name="unit_cost" type="number" min="0" step="1" defaultValue={product?.unit_cost ?? 0} className="input" />
          </Field>
          <Field label="Costo packaging">
            <input name="packaging_cost" type="number" min="0" step="1" defaultValue={product?.packaging_cost ?? 0} className="input" />
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">Detalles</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Material">
            <input name="material" defaultValue={product?.material ?? ''} className="input" />
          </Field>
          <Field label="Tela">
            <input name="fabric" defaultValue={product?.fabric ?? ''} className="input" />
          </Field>
          <Field label="Cuidados" full>
            <input name="care" defaultValue={product?.care ?? ''} className="input" />
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">SEO</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SEO title">
            <input name="seo_title" defaultValue={product?.seo_title ?? ''} className="input" />
          </Field>
          <Field label="SEO description">
            <input name="seo_description" defaultValue={product?.seo_description ?? ''} className="input" />
          </Field>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">Visibilidad</h2>
        <div className="flex flex-wrap gap-5">
          <Check name="active" label="Activo (visible en la tienda)" defaultChecked={product ? product.active : true} />
          <Check name="featured" label="Producto destacado" defaultChecked={product?.featured ?? false} />
          <Check name="allow_backorder" label="Aceptar pedidos sin stock" defaultChecked={product?.allow_backorder ?? false} />
          <Check name="hide_when_out_of_stock" label="Ocultar si está agotado" defaultChecked={product?.hide_when_out_of_stock ?? false} />
          <Check name="transfer_discount" label="Aplica descuento por transferencia" defaultChecked={product ? product.transfer_discount !== false : true} />
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.error}</p>
      )}
      {state.ok && product && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">Cambios guardados.</p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'Guardando…' : 'Guardar producto'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  full,
  children,
}: {
  label: string;
  hint?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${full ? 'sm:col-span-2 lg:col-span-4' : ''}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-navy/50">{hint}</span>}
    </label>
  );
}

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />
      {label}
    </label>
  );
}
