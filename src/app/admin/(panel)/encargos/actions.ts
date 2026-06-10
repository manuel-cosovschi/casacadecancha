'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter } from '@/lib/admin/actions-helpers';

type Result = { ok?: boolean; error?: string };

interface EncargoItemInput {
  product: string;
  size?: string;
  quantity: number;
  sale_price: number;
  unit_cost: number;
}

interface EncargoInput {
  id?: string;
  customer_name: string;
  contact?: string;
  supplier?: string;
  supplier_ordered?: boolean;
  paid?: boolean;
  status?: string;
  notes?: string;
  items: EncargoItemInput[];
}

async function guard(): Promise<Result | null> {
  try {
    await assertWriter();
    return null;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Crea o actualiza un encargo con sus ítems. */
export async function saveEncargo(input: EncargoInput): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();

  const header = {
    customer_name: input.customer_name?.trim() || 'Sin nombre',
    contact: input.contact?.trim() || null,
    supplier: input.supplier?.trim() || null,
    supplier_ordered: Boolean(input.supplier_ordered),
    paid: Boolean(input.paid),
    status: input.status || 'pendiente',
    notes: input.notes?.trim() || null,
  };

  const items = (input.items || [])
    .filter((i) => (i.product || '').trim())
    .map((i, idx) => ({
      product: i.product.trim(),
      size: i.size?.trim() || null,
      quantity: Math.max(1, Number(i.quantity) || 1),
      sale_price: Number(i.sale_price) || 0,
      unit_cost: Number(i.unit_cost) || 0,
      sort_order: idx,
    }));

  if (items.length === 0) return { error: 'Agregá al menos un ítem (modelo/talle).' };

  let encargoId = input.id;
  if (encargoId) {
    const { error } = await supabase.from('encargos').update(header).eq('id', encargoId);
    if (error) return { error: error.message };
    await supabase.from('encargo_items').delete().eq('encargo_id', encargoId);
  } else {
    const { data, error } = await supabase.from('encargos').insert(header).select('id').single();
    if (error || !data) return { error: error?.message || 'No se pudo crear.' };
    encargoId = data.id;
  }

  const { error: itErr } = await supabase
    .from('encargo_items')
    .insert(items.map((i) => ({ ...i, encargo_id: encargoId })));
  if (itErr) return { error: itErr.message };

  revalidatePath('/admin/encargos');
  return { ok: true };
}

/** Toggles rápidos del encabezado (proveedor pedido / pagado / estado). */
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
