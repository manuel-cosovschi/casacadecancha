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

export interface CatalogVariant {
  id: string;
  product_id: string;
  productName: string;
  size: string | null;
  label: string;
}

/** Variantes del catálogo (para vincular encargos/pedidos con el stock web). */
export async function getCatalogVariants(): Promise<CatalogVariant[]> {
  const supabase = await db();
  const { data } = await supabase
    .from('product_variants')
    .select('id, product_id, size, sort_order, active, products(name, active)')
    .eq('active', true)
    .order('sort_order');
  return (data ?? [])
    .filter((v: any) => (Array.isArray(v.products) ? v.products[0] : v.products)?.active)
    .map((v: any) => {
      const product = Array.isArray(v.products) ? v.products[0] : v.products;
      return {
        id: v.id,
        product_id: v.product_id,
        productName: product?.name ?? 'Producto',
        size: v.size,
        label: `${product?.name ?? 'Producto'}${v.size ? ` · ${v.size}` : ''}`,
      };
    });
}

export async function getSupplierOrders() {
  const supabase = await db();
  const { data } = await supabase
    .from('supplier_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  return data ?? [];
}

export interface StockMatrixRow {
  key: string;
  product: string;
  size: string;
  reserved: number; // demanda de encargos (no cancelados): pendiente + entregado
  ordered: number; // comprado al proveedor
  available: number; // ordered - reserved
}

/** Stock por modelo+talle: comprado al proveedor vs reservado por encargos. */
export async function getStockMatrix(): Promise<StockMatrixRow[]> {
  const supabase = await db();
  const [{ data: items }, { data: orders }] = await Promise.all([
    supabase.from('encargo_items').select('product, size, quantity, encargos(status)'),
    supabase.from('supplier_orders').select('product, size, quantity'),
  ]);

  const map = new Map<string, StockMatrixRow>();
  const get = (product: string, size: string) => {
    const p = (product || '—').trim();
    const s = (size || '').trim();
    const key = `${p.toLowerCase()}|${s.toLowerCase()}`;
    let row = map.get(key);
    if (!row) {
      row = { key, product: p, size: s, reserved: 0, ordered: 0, available: 0 };
      map.set(key, row);
    }
    return row;
  };

  for (const it of (items ?? []) as any[]) {
    const status = Array.isArray(it.encargos) ? it.encargos[0]?.status : it.encargos?.status;
    if (status === 'cancelado') continue;
    get(it.product, it.size).reserved += it.quantity || 0;
  }
  for (const o of (orders ?? []) as any[]) {
    get(o.product, o.size).ordered += o.quantity || 0;
  }

  const rows = Array.from(map.values()).map((r) => ({ ...r, available: r.ordered - r.reserved }));
  return rows.sort((a, b) => a.product.localeCompare(b.product) || a.size.localeCompare(b.size));
}
