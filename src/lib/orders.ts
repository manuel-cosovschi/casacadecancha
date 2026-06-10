import { createAdminClient } from '@/lib/supabase/admin';
import type { Order } from '@/lib/types';

/** Lee un pedido por número (usa service role; sólo en servidor). */
export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return null;
  }
  const { data } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('order_number', orderNumber)
    .maybeSingle();
  return (data as Order) ?? null;
}
