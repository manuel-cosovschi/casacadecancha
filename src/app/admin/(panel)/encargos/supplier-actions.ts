'use server';

import { randomUUID } from 'crypto';
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

export interface SupplierItemInput {
  product: string;
  size?: string | null;
  quantity: number;
  unit_cost: number;
  variant_id?: string | null;
}

export interface SupplierBatchInput {
  supplier?: string | null;
  status?: string; // 'pedido' | 'recibido'
  shipping_cost?: number; // total del envío del pedido (se prorratea por unidad)
  notes?: string | null;
  items: SupplierItemInput[];
}

/** Convierte el input en filas listas para insertar, prorrateando el envío por cantidad. */
function buildRows(input: SupplierBatchInput, batchId: string) {
  const items = (input.items || [])
    .map((i) => ({
      product: (i.product || '').trim() || '—',
      size: (i.size || '').toString().trim() || null,
      quantity: Math.max(1, Math.round(Number(i.quantity) || 1)),
      unit_cost: Math.max(0, Number(i.unit_cost) || 0),
      variant_id: i.variant_id || null,
    }))
    .filter((i) => (i.product || '').trim() !== '');

  const totalQty = items.reduce((a, i) => a + i.quantity, 0) || 1;
  const totalShip = Math.max(0, Number(input.shipping_cost) || 0);
  let assigned = 0;
  return items.map((i, idx) => {
    // El envío se reparte por unidad; la última línea absorbe el redondeo.
    const ship =
      idx === items.length - 1
        ? Math.round((totalShip - assigned) * 100) / 100
        : Math.round(((totalShip * i.quantity) / totalQty) * 100) / 100;
    assigned += ship;
    return {
      batch_id: batchId,
      supplier: input.supplier?.trim() || null,
      product: i.product,
      size: i.size,
      quantity: i.quantity,
      unit_cost: i.unit_cost,
      shipping_cost: ship,
      status: input.status || 'pedido',
      variant_id: i.variant_id,
      notes: input.notes?.trim() || null,
    };
  });
}

export async function createSupplierBatch(input: SupplierBatchInput): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const batchId = randomUUID();
  const rows = buildRows(input, batchId);
  if (rows.length === 0) return { error: 'Agregá al menos un producto al pedido.' };

  const { error } = await supabase.from('supplier_orders').insert(rows);
  if (error) return { error: error.message };

  if ((input.status || 'pedido') === 'recibido') {
    for (const r of rows) if (r.variant_id) await adjustPhysicalStock(r.variant_id, r.quantity);
  }
  revalidatePath('/admin/encargos');
  return { ok: true };
}

export async function updateSupplierBatch(batchId: string, input: SupplierBatchInput): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();

  // Filas viejas (para revertir stock si estaban recibidas).
  const { data: oldRows } = await supabase
    .from('supplier_orders')
    .select('quantity, variant_id, status')
    .eq('batch_id', batchId);
  const wasReceived = (oldRows ?? []).some((r: any) => r.status === 'recibido');
  if (wasReceived) {
    for (const r of (oldRows ?? []) as any[]) {
      if (r.variant_id) await adjustPhysicalStock(r.variant_id, -(r.quantity || 0));
    }
  }

  await supabase.from('supplier_orders').delete().eq('batch_id', batchId);

  const rows = buildRows(input, batchId);
  if (rows.length === 0) return { error: 'Agregá al menos un producto al pedido.' };
  const { error } = await supabase.from('supplier_orders').insert(rows);
  if (error) return { error: error.message };

  if ((input.status || 'pedido') === 'recibido') {
    for (const r of rows) if (r.variant_id) await adjustPhysicalStock(r.variant_id, r.quantity);
  }
  revalidatePath('/admin/encargos');
  return { ok: true };
}

export async function setSupplierBatchStatus(
  batchId: string,
  status: 'pedido' | 'recibido',
): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('supplier_orders')
    .select('quantity, variant_id, status')
    .eq('batch_id', batchId);

  const wasReceived = (rows ?? []).some((r: any) => r.status === 'recibido');
  const nowReceived = status === 'recibido';

  const { error } = await supabase.from('supplier_orders').update({ status }).eq('batch_id', batchId);
  if (error) return { error: error.message };

  if (!wasReceived && nowReceived) {
    for (const r of (rows ?? []) as any[]) if (r.variant_id) await adjustPhysicalStock(r.variant_id, r.quantity || 0);
  } else if (wasReceived && !nowReceived) {
    for (const r of (rows ?? []) as any[]) if (r.variant_id) await adjustPhysicalStock(r.variant_id, -(r.quantity || 0));
  }
  revalidatePath('/admin/encargos');
  return { ok: true };
}

export async function deleteSupplierBatch(batchId: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from('supplier_orders')
    .select('quantity, variant_id, status')
    .eq('batch_id', batchId);

  const { error } = await supabase.from('supplier_orders').delete().eq('batch_id', batchId);
  if (error) return { error: error.message };

  if ((rows ?? []).some((r: any) => r.status === 'recibido')) {
    for (const r of (rows ?? []) as any[]) if (r.variant_id) await adjustPhysicalStock(r.variant_id, -(r.quantity || 0));
  }
  revalidatePath('/admin/encargos');
  return { ok: true };
}
