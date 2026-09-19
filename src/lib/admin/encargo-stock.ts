import { createClient } from '@/lib/supabase/server';
import { notifyRestock } from '@/lib/admin/restock';

/**
 * Recalcula la reserva por encargos de cada variante:
 * encargo_reserved = cantidades de ítems vinculados en encargos NO cancelados
 * y TODAVÍA NO ENTREGADOS. Es idempotente (no acumula errores).
 *
 * Lo de "no entregados" faltaba, y salía caro: una camiseta entregada seguía
 * reservando stock para siempre. Como entregar tampoco descontaba el físico
 * (ver `setItemDelivered`), los dos errores se tapaban entre sí y la
 * disponibilidad daba bien — pero el físico contaba camisetas que ya no
 * estaban en la casa. El día que alguien recalculaba las reservas, esas
 * unidades fantasma pasaban a estar a la venta.
 */
export async function syncEncargoReserved(variantIds: (string | null | undefined)[]): Promise<void> {
  const ids = Array.from(new Set(variantIds.filter(Boolean) as string[]));
  if (ids.length === 0) return;
  try {
    const supabase = await createClient();
    for (const variantId of ids) {
      const { data: items } = await supabase
        .from('encargo_items')
        .select('quantity, delivered, encargos(status)')
        .eq('variant_id', variantId);
      let reserved = 0;
      for (const it of (items ?? []) as any[]) {
        const status = Array.isArray(it.encargos) ? it.encargos[0]?.status : it.encargos?.status;
        if (status === 'cancelado') continue;
        // Lo entregado ya salió de la casa: no hay nada que reservar.
        if (it.delivered) continue;
        reserved += it.quantity || 0;
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
