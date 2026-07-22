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

/** Datos acotados que devuelve el seguimiento público por código. */
export interface TrackedOrder {
  order_number: string;
  payment_status: string;
  order_status: string;
  delivery_status: string | null;
  delivery_updated_at: string | null;
  shipping_method: string | null;
  carrier: string | null;
  tracking_code: string | null;
  tracking_ref: string;
  customer_name: string | null;
  city: string | null;
  province: string | null;
  created_at: string;
}

/** Consulta pública del seguimiento por código alfanumérico (no expone datos sensibles). */
export async function trackOrder(ref: string): Promise<TrackedOrder | null> {
  const clean = (ref || '').trim().toUpperCase();
  if (clean.length < 4) return null;
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return null;
  }
  const { data } = await supabase.rpc('storefront_track_order', { p_ref: clean });
  return (data as TrackedOrder) ?? null;
}
