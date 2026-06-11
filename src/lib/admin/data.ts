import { createClient } from '@/lib/supabase/server';

async function db() {
  return createClient();
}

export async function getAdminProducts() {
  const supabase = await db();
  const { data } = await supabase
    .from('products')
    .select('*, images:product_images(*), variants:product_variants(*), categories(name)')
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getAdminProduct(id: string) {
  const supabase = await db();
  const { data } = await supabase
    .from('products')
    .select('*, images:product_images(*), variants:product_variants(*)')
    .eq('id', id)
    .maybeSingle();
  return data;
}

export async function getCategories() {
  const supabase = await db();
  const { data } = await supabase.from('categories').select('*').order('sort_order');
  return data ?? [];
}

export async function getAdminCollections() {
  const supabase = await db();
  const { data } = await supabase.from('collections').select('*').order('sort_order');
  return data ?? [];
}

export async function getAdminOrders(filters?: { status?: string; payment?: string }) {
  const supabase = await db();
  let q = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
  if (filters?.payment) q = q.eq('payment_status', filters.payment);
  if (filters?.status) q = q.eq('order_status', filters.status);
  const { data } = await q;
  return data ?? [];
}

export async function getAdminOrder(orderNumber: string) {
  const supabase = await db();
  const { data } = await supabase
    .from('orders')
    .select('*, order_items(*), payments(*)')
    .eq('order_number', orderNumber)
    .maybeSingle();
  return data;
}

export async function getCustomers() {
  const supabase = await db();
  const { data } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  return data ?? [];
}

export async function getExpenses() {
  const supabase = await db();
  const { data } = await supabase.from('expenses').select('*').order('date', { ascending: false }).limit(300);
  return data ?? [];
}

export async function getPromotions() {
  const supabase = await db();
  const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
  return data ?? [];
}

export async function getAdMetrics() {
  const supabase = await db();
  const { data } = await supabase.from('ad_metrics').select('*').order('date', { ascending: false }).limit(300);
  return data ?? [];
}

export async function getAdminFaqs() {
  const supabase = await db();
  const { data } = await supabase.from('faqs').select('*').order('sort_order');
  return data ?? [];
}

export async function getAdminSizeGuides() {
  const supabase = await db();
  const { data } = await supabase.from('size_guides').select('*').order('sort_order');
  return data ?? [];
}

export async function getProfiles() {
  const supabase = await db();
  const { data } = await supabase.from('profiles').select('*').order('created_at');
  return data ?? [];
}

export async function getActivityLogs() {
  const supabase = await db();
  const { data } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return data ?? [];
}

export async function getInventory() {
  const supabase = await db();
  const { data } = await supabase
    .from('product_variants')
    .select('*, products(name, slug)')
    .order('stock_physical', { ascending: true });
  return data ?? [];
}

export async function getStoreSettings() {
  const supabase = await db();
  const { data } = await supabase.from('store_settings').select('*');
  const map: Record<string, any> = {};
  for (const row of data ?? []) map[row.key] = row.value_json;
  return map;
}

export async function getStockNotifications() {
  const supabase = await db();
  const { data } = await supabase
    .from('stock_notifications')
    .select('*, products(name, slug)')
    .order('created_at', { ascending: false })
    .limit(300);
  return data ?? [];
}

export async function getAbandonedCarts() {
  const supabase = await db();
  const { data } = await supabase
    .from('abandoned_carts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200);
  return data ?? [];
}

export async function getEncargos() {
  const supabase = await db();
  const { data } = await supabase
    .from('encargos')
    .select('*, items:encargo_items(*)')
    .order('created_at', { ascending: false });
  return (data ?? []).map((e: any) => ({
    ...e,
    items: (e.items ?? []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
  }));
}

export interface StockMatrixRow {
  key: string;
  product: string;
  size: string;
  reserved: number;
  ordered: number;
  available: number;
}

/** Stock por modelo+talle a partir de los encargos: reservado vs pedido al proveedor. */
export async function getStockMatrix(): Promise<StockMatrixRow[]> {
  const supabase = await db();
  const { data } = await supabase
    .from('encargo_items')
    .select('product, size, quantity, ordered_qty, encargos(status)');
  const map = new Map<string, StockMatrixRow>();
  for (const it of (data ?? []) as any[]) {
    const product = (it.product || '—').trim();
    const size = (it.size || '').trim();
    const key = `${product.toLowerCase()}|${size.toLowerCase()}`;
    const status = Array.isArray(it.encargos) ? it.encargos[0]?.status : it.encargos?.status;
    const row = map.get(key) || { key, product, size, reserved: 0, ordered: 0, available: 0 };
    if (status !== 'cancelado') row.reserved += it.quantity || 0;
    row.ordered += it.ordered_qty || 0;
    map.set(key, row);
  }
  const rows = Array.from(map.values()).map((r) => ({ ...r, available: r.ordered - r.reserved }));
  return rows.sort((a, b) => a.product.localeCompare(b.product) || a.size.localeCompare(b.size));
}
