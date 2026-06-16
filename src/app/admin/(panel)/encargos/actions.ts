'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter } from '@/lib/admin/actions-helpers';
import { sendAdminPush } from '@/lib/push';
import { syncEncargoReserved } from '@/lib/admin/encargo-stock';
import type { SupabaseClient } from '@supabase/supabase-js';

async function variantIdsOfEncargo(supabase: SupabaseClient, encargoId: string): Promise<string[]> {
  const { data } = await supabase
    .from('encargo_items')
    .select('variant_id')
    .eq('encargo_id', encargoId);
  return (data ?? []).map((r: any) => r.variant_id).filter(Boolean);
}

function keyOf(product: string, size: string) {
  return `${(product || '').trim().toLowerCase()}|${(size || '').trim().toLowerCase()}`;
}

/** Disponible por modelo+talle = comprado al proveedor − reservado por encargos (no cancelados). */
async function availabilityMap(
  supabase: SupabaseClient,
): Promise<Map<string, { available: number; product: string; size: string }>> {
  const [{ data: items }, { data: orders }] = await Promise.all([
    supabase.from('encargo_items').select('product, size, quantity, encargos(status)'),
    supabase.from('supplier_orders').select('product, size, quantity'),
  ]);
  const map = new Map<string, { available: number; product: string; size: string }>();
  const get = (product: string, size: string) => {
    const k = keyOf(product, size);
    let row = map.get(k);
    if (!row) {
      row = { available: 0, product: (product || '').trim(), size: (size || '').trim() };
      map.set(k, row);
    }
    return row;
  };
  for (const it of (items ?? []) as any[]) {
    const status = Array.isArray(it.encargos) ? it.encargos[0]?.status : it.encargos?.status;
    if (status === 'cancelado') continue;
    get(it.product, it.size).available -= it.quantity || 0;
  }
  for (const o of (orders ?? []) as any[]) {
    get(o.product, o.size).available += o.quantity || 0;
  }
  return map;
}

type Result = { ok?: boolean; error?: string };

interface EncargoItemInput {
  product: string;
  size?: string;
  quantity: number;
  ordered_qty?: number;
  variant_id?: string | null;
  sale_price: number;
  unit_cost: number;
}

type PaymentStatus = 'unpaid' | 'deposit' | 'paid';

interface EncargoInput {
  id?: string;
  customer_name: string;
  contact?: string;
  supplier?: string;
  supplier_ordered?: boolean;
  paid?: boolean;
  payment_status?: PaymentStatus;
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

  // payment_status manda; `paid` queda sincronizado para compatibilidad.
  const payment_status: PaymentStatus =
    input.payment_status ?? (input.paid ? 'paid' : 'unpaid');
  const header = {
    customer_name: input.customer_name?.trim() || 'Sin nombre',
    contact: input.contact?.trim() || null,
    supplier: input.supplier?.trim() || null,
    supplier_ordered: Boolean(input.supplier_ordered),
    payment_status,
    paid: payment_status === 'paid',
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
      variant_id: i.variant_id || null,
      sale_price: Number(i.sale_price) || 0,
      unit_cost: Number(i.unit_cost) || 0,
      sort_order: idx,
    }));

  if (items.length === 0) return { error: 'Agregá al menos un ítem (modelo/talle).' };

  // Estado de stock ANTES de guardar (para detectar quiebre).
  const before = await availabilityMap(supabase);

  let encargoId = input.id;
  const oldVariantIds = encargoId ? await variantIdsOfEncargo(supabase, encargoId) : [];
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

  // Sincronizar la reserva por encargos en el stock web (variantes afectadas).
  await syncEncargoReserved([...oldVariantIds, ...items.map((i) => i.variant_id)]);

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
  // Mantener `paid` sincronizado si se cambia el estado de pago.
  if ('payment_status' in patch) {
    patch = { ...patch, paid: patch.payment_status === 'paid' };
  }
  const { error } = await supabase.from('encargos').update(patch).eq('id', id);
  if (error) return { error: error.message };
  // Si cambió el estado (ej. a/desde cancelado), recalcular reserva web.
  if ('status' in patch) {
    await syncEncargoReserved(await variantIdsOfEncargo(supabase, id));
  }
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
  const variantIds = await variantIdsOfEncargo(supabase, id);
  const { error } = await supabase.from('encargos').delete().eq('id', id);
  if (error) return { error: error.message };
  await syncEncargoReserved(variantIds);
  revalidatePath('/admin/encargos');
  return { ok: true };
}
