import { createClient } from '@/lib/supabase/server';
import { notifyRestock } from '@/lib/admin/restock';

/**
 * Recalcula la reserva por encargos de cada variante:
 * encargo_reserved = suma de cantidades de ítems vinculados en encargos NO cancelados.
 * Es idempotente (no acumula errores).
 */
export async function syncEncargoReserved(variantIds: (string | null | undefined)[]): Promise<void> {
  const ids = Array.from(new Set(variantIds.filter(Boolean) as string[]));
  if (ids.length === 0) return;
  try {
    const supabase = await createClient();
    for (const variantId of ids) {
      const { data: items } = await supabase
        .from('encargo_items')
        .select('quantity, encargos(status)')
        .eq('variant_id', variantId);
      let reserved = 0;
      for (const it of (items ?? []) as any[]) {
        const status = Array.isArray(it.encargos) ? it.encargos[0]?.status : it.encargos?.status;
        if (status !== 'cancelado') reserved += it.quantity || 0;
      }
      await supabase
        .from('product_variants')
        .update({ encargo_reserved: reserved })
        .eq('id', variantId);
    }
  } catch {
    /* no-op */
  }
}

/** Ajusta el stock físico de una variante cuando llega/se revierte un pedido al proveedor. */
export async function adjustPhysicalStock(variantId: string, delta: number): Promise<void> {
  if (!variantId || !delta) return;
  try {
    const supabase = await createClient();
    const { data: v } = await supabase
      .from('product_variants')
      .select('stock_physical')
      .eq('id', variantId)
      .maybeSingle();
    if (!v) return;
    await supabase
      .from('product_variants')
      .update({ stock_physical: Math.max(0, (v.stock_physical || 0) + delta) })
      .eq('id', variantId);
    if (delta > 0) await notifyRestock(variantId);
  } catch {
    /* no-op */
  }
}
