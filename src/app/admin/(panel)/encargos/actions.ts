'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter } from '@/lib/admin/actions-helpers';
import { sendAdminPush } from '@/lib/push';
import type { SupabaseClient } from '@supabase/supabase-js';

function keyOf(product: string, size: string) {
  return `${(product || '').trim().toLowerCase()}|${(size || '').trim().toLowerCase()}`;
}

/** Disponible por modelo+talle = pedido al proveedor − comprometido (no cancelado). */
async function availabilityMap(
  supabase: SupabaseClient,
): Promise<Map<string, { available: number; product: string; size: string }>> {
  const { data } = await supabase
    .from('encargo_items')
    .select('product, size, quantity, ordered_qty, encargos(status)');
  const map = new Map<string, { available: number; product: string; size: string }>();
  for (const it of (data ?? []) as any[]) {
    const status = Array.isArray(it.encargos) ? it.encargos[0]?.status : it.encargos?.status;
    if (status === 'cancelado') continue;
    const k = keyOf(it.product, it.size);
    const row = map.get(k) || { available: 0, product: (it.product || '').trim(), size: (it.size || '').trim() };
    row.available += (it.ordered_qty || 0) - (it.quantity || 0);
    map.set(k, row);
  }
  return map;
}

type Result = { ok?: boolean; error?: string };

interface EncargoItemInput {
  product: string;
  size?: string;
  quantity: number;
  ordered_qty?: number;
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
      ordered_qty: Math.max(0, Number(i.ordered_qty) || 0),
      sale_price: Number(i.sale_price) || 0,
      unit_cost: Number(i.unit_cost) || 0,
      sort_order: idx,
    }));

  if (items.length === 0) return { error: 'Agregá al menos un ítem (modelo/talle).' };

  // Estado de stock ANTES de guardar (para detectar quiebre).
  const before = await availabilityMap(supabase);

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

  // Estado DESPUÉS: si algún modelo+talle pasó de tener stock a quedarse sin, avisar.
  try {
    const after = await availabilityMap(supabase);
    const affected = new Set(items.map((i) => keyOf(i.product, i.size || '')));
    for (const k of affected) {
      const a = after.get(k);
      const bAvail = before.get(k)?.available ?? 0;
      if (a && bAvail > 0 && a.available <= 0) {
        const label = `${a.product}${a.size ? ` talle ${a.size}` : ''}`;
        const faltan = -a.available;
        await sendAdminPush(
          '⚠️ Te quedaste sin stock',
          `${label}: ${faltan > 0 ? `faltan pedir ${faltan} al proveedor` : 'stock agotado del pedido actual'}.`,
          '/admin/encargos',
          `stock-${k}`,
        );
      }
    }
  } catch {
    /* el aviso no debe romper el guardado */
  }

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

/** Actualiza rápido cuántas unidades de un ítem se pidieron al proveedor. */
export async function updateItemOrdered(itemId: string, orderedQty: number): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { error } = await supabase
    .from('encargo_items')
    .update({ ordered_qty: Math.max(0, Math.round(orderedQty) || 0) })
    .eq('id', itemId);
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
