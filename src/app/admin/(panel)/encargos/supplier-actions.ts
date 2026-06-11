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

export async function createSupplierOrder(formData: FormData): Promise<void> {
  if (await guard()) return;
  const supabase = await createClient();
  await supabase.from('supplier_orders').insert({
    supplier: t(formData.get('supplier')),
    product: t(formData.get('product')) || '—',
    size: t(formData.get('size')),
    quantity: Math.max(1, n(formData.get('quantity')) || 1),
    unit_cost: n(formData.get('unit_cost')),
    status: t(formData.get('status')) || 'pedido',
    notes: t(formData.get('notes')),
  });
  revalidatePath('/admin/encargos');
}

export async function updateSupplierOrder(
  id: string,
  patch: Record<string, unknown>,
): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { error } = await supabase.from('supplier_orders').update(patch).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/encargos');
  return { ok: true };
}

export async function deleteSupplierOrder(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { error } = await supabase.from('supplier_orders').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/encargos');
  return { ok: true };
}
