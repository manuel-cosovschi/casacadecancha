'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter } from '@/lib/admin/actions-helpers';

type Result = { ok?: boolean; error?: string };

async function guard(): Promise<Result | null> {
  try {
    await assertWriter();
    return null;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const t = (v: FormDataEntryValue | null) => {
  const s = (v ?? '').toString().trim();
  return s === '' ? null : s;
};
const n = (v: FormDataEntryValue | null) => Number(v || 0);

/** Crea o actualiza un encargo desde un formulario. */
export async function saveEncargo(formData: FormData): Promise<void> {
  if (await guard()) return;
  const supabase = await createClient();
  const id = t(formData.get('id'));
  const payload = {
    customer_name: t(formData.get('customer_name')) || 'Sin nombre',
    contact: t(formData.get('contact')),
    product: t(formData.get('product')) || '—',
    size: t(formData.get('size')),
    quantity: Math.max(1, n(formData.get('quantity')) || 1),
    sale_price: n(formData.get('sale_price')),
    unit_cost: n(formData.get('unit_cost')),
    supplier: t(formData.get('supplier')),
    status: t(formData.get('status')) || 'pendiente',
    supplier_ordered: formData.get('supplier_ordered') === 'on',
    paid: formData.get('paid') === 'on',
    notes: t(formData.get('notes')),
  };
  if (id) await supabase.from('encargos').update(payload).eq('id', id);
  else await supabase.from('encargos').insert(payload);
  revalidatePath('/admin/encargos');
}

/** Actualiza campos puntuales (toggles rápidos desde la lista). */
export async function updateEncargo(
  id: string,
  patch: Record<string, unknown>,
): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { error } = await supabase.from('encargos').update(patch).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/encargos');
  return { ok: true };
}

export async function deleteEncargo(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { error } = await supabase.from('encargos').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/encargos');
  return { ok: true };
}
