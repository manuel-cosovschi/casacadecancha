import { createClient } from '@/lib/supabase/server';
import type { Order } from '@/lib/types';

/** Lee un pedido por número usando la RPC pública SECURITY DEFINER. */
export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return null;
  }
  const { data } = await supabase.rpc('storefront_get_order', {
    p_order_number: orderNumber,
  });
  return (data as Order) ?? null;
}
