import { createClient } from '@/lib/supabase/server';

async function db() {
  return createClient();
}

/** id del vendedor logueado: aísla los datos del workspace (encargos, pedidos, etc.). */
async function sellerId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? '00000000-0000-0000-0000-000000000000';
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
    .select('*, items:encargo_items(*), exchanges:encargo_exchanges(*)')
    .eq('seller_id', await sellerId())
    .order('created_at', { ascending: false });
  return (data ?? []).map((e: any) => ({
    ...e,
    items: (e.items ?? []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    exchanges: (e.exchanges ?? []).sort(
      (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
  }));
}

export interface CatalogVariant {
  id: string;
  product_id: string;
  productName: string;
  size: string | null;
  label: string;
  /** Costo unitario efectivo (producto + envío prorrateado) según pedidos al proveedor. */
  cost: number;
}

/** Variantes del catálogo (para vincular encargos/pedidos con el stock web). */
export async function getCatalogVariants(): Promise<CatalogVariant[]> {
  const supabase = await db();
  const [{ data }, { data: orders }] = await Promise.all([
    supabase
      .from('product_variants')
      .select('id, product_id, size, sort_order, active, products(name, active)')
      .eq('active', true)
      .order('sort_order'),
    supabase.from('supplier_orders').select('variant_id, quantity, unit_cost, shipping_cost').eq('seller_id', await sellerId()),
  ]);

  // Costo unitario efectivo por variante = (Σ costo*cant + Σ envío) / Σ cant
  const costAgg = new Map<string, { total: number; qty: number }>();
  for (const o of (orders ?? []) as any[]) {
    if (!o.variant_id) continue;
    const agg = costAgg.get(o.variant_id) || { total: 0, qty: 0 };
    agg.total += Number(o.unit_cost) * o.quantity + Number(o.shipping_cost || 0);
    agg.qty += o.quantity;
    costAgg.set(o.variant_id, agg);
  }

  return (data ?? [])
    .filter((v: any) => (Array.isArray(v.products) ? v.products[0] : v.products)?.active)
    .map((v: any) => {
      const product = Array.isArray(v.products) ? v.products[0] : v.products;
      const agg = costAgg.get(v.id);
      const cost = agg && agg.qty > 0 ? Math.round(agg.total / agg.qty) : 0;
      return {
        id: v.id,
        product_id: v.product_id,
        productName: product?.name ?? 'Producto',
        size: v.size,
        label: `${product?.name ?? 'Producto'}${v.size ? ` · ${v.size}` : ''}`,
        cost,
      };
    });
}

export interface EncargoFinancials {
  paidRevenue: number;
  paidCost: number;
  paidMargin: number;
  pendingRevenue: number;
  pendingMargin: number;
  paidCount: number;
  pendingCount: number;
}

/** Facturación y ganancia de los encargos creados en un rango. */
export async function getEncargoFinancials(fromIso: string, toIso: string): Promise<EncargoFinancials> {
  const supabase = await db();
  const { data } = await supabase
    .from('encargos')
    .select('paid, payment_status, paid_amount, status, created_at, items:encargo_items(quantity, sale_price, unit_cost)')
    .eq('seller_id', await sellerId())
    .gte('created_at', fromIso)
    .lte('created_at', toIso);

  const r: EncargoFinancials = {
    paidRevenue: 0, paidCost: 0, paidMargin: 0,
    pendingRevenue: 0, pendingMargin: 0, paidCount: 0, pendingCount: 0,
  };
  for (const e of (data ?? []) as any[]) {
    if (e.status === 'cancelado') continue;
    let rev = 0, cost = 0;
    for (const it of e.items ?? []) {
      rev += Number(it.sale_price) * it.quantity;
      cost += Number(it.unit_cost) * it.quantity;
    }
    const margin = rev - cost;
    // Cobrado real: total si pagado, monto de la seña si parcial, 0 si no pagó.
    const status: string = e.payment_status ?? (e.paid ? 'paid' : 'unpaid');
    const collected =
      status === 'paid' ? rev : status === 'deposit' ? Math.min(Number(e.paid_amount) || 0, rev) : 0;
    const f = rev > 0 ? collected / rev : status === 'paid' ? 1 : 0;
    if (collected > 0) {
      r.paidRevenue += collected; r.paidCost += cost * f; r.paidMargin += margin * f; r.paidCount += 1;
    }
    if (collected < rev) {
      r.pendingRevenue += rev - collected; r.pendingMargin += margin * (1 - f);
      if (collected === 0) r.pendingCount += 1;
    }
  }
  return r;
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

export interface SupplierBatch {
  batch_id: string;
  supplier: string | null;
  status: string; // 'pedido' | 'recibido'
  created_at: string;
  shipping_cost: number; // total del envío del pedido
  total_qty: number;
  total_cost: number; // mercadería + envío
  items: {
    id: string;
    product: string;
    size: string | null;
    quantity: number;
    unit_cost: number;
    shipping_cost: number;
    variant_id: string | null;
  }[];
}

/** Pedidos al proveedor agrupados por batch_id (un pedido = varias líneas). */
export async function getSupplierBatches(): Promise<SupplierBatch[]> {
  const supabase = await db();
  const { data } = await supabase
    .from('supplier_orders')
    .select('id, batch_id, supplier, product, size, quantity, unit_cost, shipping_cost, status, variant_id, created_at')
    .eq('seller_id', await sellerId())
    .order('created_at', { ascending: false })
    .limit(500);

  const map = new Map<string, SupplierBatch>();
  for (const r of (data ?? []) as any[]) {
    const key = r.batch_id || r.id;
    let b = map.get(key);
    if (!b) {
      b = {
        batch_id: key,
        supplier: r.supplier ?? null,
        status: r.status,
        created_at: r.created_at,
        shipping_cost: 0,
        total_qty: 0,
        total_cost: 0,
        items: [],
      };
      map.set(key, b);
    }
    b.items.push({
      id: r.id,
      product: r.product,
      size: r.size,
      quantity: r.quantity,
      unit_cost: Number(r.unit_cost) || 0,
      shipping_cost: Number(r.shipping_cost) || 0,
      variant_id: r.variant_id ?? null,
    });
    b.shipping_cost += Number(r.shipping_cost) || 0;
    b.total_qty += r.quantity || 0;
    b.total_cost += (Number(r.unit_cost) || 0) * (r.quantity || 0) + (Number(r.shipping_cost) || 0);
    // Si alguna línea figura recibida, el pedido se considera recibido.
    if (r.status === 'recibido') b.status = 'recibido';
  }
  return Array.from(map.values());
}

export interface StockMatrixRow {
  key: string;
  product: string;
  size: string;
  reserved: number; // demanda de encargos (no cancelados): pendiente + entregado
  ordered: number; // comprado al proveedor
  adjusted: number; // ajustes manuales (+/-)
  gifted: number; // regalado (sale del stock)
  available: number; // ordered + adjusted - gifted - reserved
}

/** Stock por modelo+talle: comprado al proveedor + ajustes vs reservado por encargos y regalos. */
export async function getStockMatrix(): Promise<StockMatrixRow[]> {
  const supabase = await db();
  const sid = await sellerId();
  const [{ data: items }, { data: orders }, { data: adjustments }, { data: gifts }] = await Promise.all([
    supabase.from('encargo_items').select('product, size, quantity, encargos!inner(status, seller_id)').eq('encargos.seller_id', sid),
    supabase.from('supplier_orders').select('product, size, quantity').eq('seller_id', sid),
    supabase.from('stock_adjustments').select('product, size, delta').eq('seller_id', sid),
    supabase.from('gifts').select('product, size, quantity').eq('seller_id', sid),
  ]);

  const map = new Map<string, StockMatrixRow>();
  const get = (product: string, size: string) => {
    const p = (product || '—').trim();
    const s = (size || '').trim();
    const key = `${p.toLowerCase()}|${s.toLowerCase()}`;
    let row = map.get(key);
    if (!row) {
      row = { key, product: p, size: s, reserved: 0, ordered: 0, adjusted: 0, gifted: 0, available: 0 };
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
  for (const a of (adjustments ?? []) as any[]) {
    get(a.product, a.size).adjusted += a.delta || 0;
  }
  for (const gft of (gifts ?? []) as any[]) {
    get(gft.product, gft.size).gifted += gft.quantity || 0;
  }

  const rows = Array.from(map.values()).map((r) => ({
    ...r,
    available: r.ordered + r.adjusted - r.gifted - r.reserved,
  }));
  return rows.sort((a, b) => a.product.localeCompare(b.product) || a.size.localeCompare(b.size));
}

export async function getStockAdjustments() {
  const supabase = await db();
  const { data } = await supabase
    .from('stock_adjustments')
    .select('*')
    .eq('seller_id', await sellerId())
    .order('created_at', { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getGifts() {
  const supabase = await db();
  const { data } = await supabase
    .from('gifts')
    .select('*')
    .eq('seller_id', await sellerId())
    .order('created_at', { ascending: false })
    .limit(100);
  return data ?? [];
}

export interface IncomingStockRow {
  product: string;
  size: string | null;
  inTransit: number; // unidades pedidas al proveedor que todavía no llegaron
  leftover: number; // lo que quedaría libre una vez que llegue (neto de reservas)
}

/**
 * Stock "en camino": pedidos al proveedor en estado 'pedido' (sin recibir),
 * vinculados a variantes web. `leftover` ya descuenta lo reservado (encargos + web),
 * incluso cuando hoy hay stock negativo por reservas sin cubrir.
 */
export async function getIncomingStock(): Promise<IncomingStockRow[]> {
  const supabase = await db();
  const [{ data: variants }, { data: orders }] = await Promise.all([
    supabase
      .from('product_variants')
      .select('id, size, stock_physical, stock_reserved, encargo_reserved, products(name)')
      .eq('active', true),
    supabase.from('supplier_orders').select('variant_id, quantity').eq('status', 'pedido'),
  ]);

  const pending = new Map<string, number>();
  for (const o of (orders ?? []) as any[]) {
    if (!o.variant_id) continue;
    pending.set(o.variant_id, (pending.get(o.variant_id) || 0) + (o.quantity || 0));
  }

  const rows: IncomingStockRow[] = [];
  for (const v of (variants ?? []) as any[]) {
    const inTransit = pending.get(v.id) || 0;
    if (inTransit <= 0) continue;
    // Neto SIN piso en cero: si hay reservas sin cubrir, el pedido las absorbe primero.
    const rawAvail = (v.stock_physical || 0) - (v.stock_reserved || 0) - (v.encargo_reserved || 0);
    const product = (Array.isArray(v.products) ? v.products[0] : v.products)?.name ?? 'Producto';
    rows.push({ product, size: v.size, inTransit, leftover: rawAvail + inTransit });
  }
  return rows.sort((a, b) => a.product.localeCompare(b.product) || (a.size || '').localeCompare(b.size || ''));
}
