'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter } from '@/lib/admin/actions-helpers';
import { adjustPhysicalStock } from '@/lib/admin/encargo-stock';

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
  const variant_id = t(formData.get('variant_id'));
  const quantity = Math.max(1, n(formData.get('quantity')) || 1);
  const status = t(formData.get('status')) || 'pedido';
  await supabase.from('supplier_orders').insert({
    supplier: t(formData.get('supplier')),
    product: t(formData.get('product')) || '—',
    size: t(formData.get('size')),
    quantity,
    unit_cost: n(formData.get('unit_cost')),
    shipping_cost: n(formData.get('shipping_cost')),
    status,
    variant_id,
    notes: t(formData.get('notes')),
  });
  // Si ya entra como recibido, suma stock web.
  if (status === 'recibido' && variant_id) await adjustPhysicalStock(variant_id, quantity);
  revalidatePath('/admin/encargos');
}

export async function updateSupplierOrder(
  id: string,
  patch: Record<string, unknown>,
): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();

  const { data: prev } = await supabase
    .from('supplier_orders')
    .select('status, quantity, variant_id')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('supplier_orders').update(patch).eq('id', id);
  if (error) return { error: error.message };

  // Ajustar stock web según transición de "recibido".
  if (prev?.variant_id && 'status' in patch) {
    const wasReceived = prev.status === 'recibido';
    const nowReceived = patch.status === 'recibido';
    if (!wasReceived && nowReceived) await adjustPhysicalStock(prev.variant_id, prev.quantity || 0);
    if (wasReceived && !nowReceived) await adjustPhysicalStock(prev.variant_id, -(prev.quantity || 0));
  }
  revalidatePath('/admin/encargos');
  return { ok: true };
}

export async function deleteSupplierOrder(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { data: prev } = await supabase
    .from('supplier_orders')
    .select('status, quantity, variant_id')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabase.from('supplier_orders').delete().eq('id', id);
  if (error) return { error: error.message };

  if (prev?.variant_id && prev.status === 'recibido') {
    await adjustPhysicalStock(prev.variant_id, -(prev.quantity || 0));
  }
  revalidatePath('/admin/encargos');
  return { ok: true };
}
