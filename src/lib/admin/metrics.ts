import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile, isOwnerRole } from '@/lib/admin/auth';
import type { Order, OrderItem } from '@/lib/types';

export type RangeKey =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'this_month'
  | 'last_month';

export function resolveRange(key: RangeKey): { from: Date; to: Date; label: string } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const endOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

  switch (key) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now), label: 'Hoy' };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y), label: 'Ayer' };
    }
    case 'last7': {
      const f = new Date(now);
      f.setDate(f.getDate() - 6);
      return { from: startOfDay(f), to: endOfDay(now), label: 'Últimos 7 días' };
    }
    case 'last30': {
      const f = new Date(now);
      f.setDate(f.getDate() - 29);
      return { from: startOfDay(f), to: endOfDay(now), label: 'Últimos 30 días' };
    }
    case 'this_month':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: endOfDay(now),
        label: 'Este mes',
      };
    case 'last_month':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
        label: 'Mes anterior',
      };
  }
}

const PAID_STATES = ['paid'];

export interface DashboardMetrics {
  label: string;
  grossRevenue: number;
  collectedRevenue: number;
  pendingRevenue: number;
  orders: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  deliveredOrders: number;
  averageTicket: number;
  unitsSold: number;
  cogs: number;
  grossMargin: number;
  adSpend: number;
  expensesTotal: number;
  giftsCost: number;
  netProfit: number;
  cpa: number;
  roas: number;
  mer: number;
  newCustomers: number;
  lowStockCount: number;
  // series
  byDay: { date: string; revenue: number; orders: number; profit: number }[];
  bySize: { size: string; units: number }[];
  byPaymentMethod: { method: string; total: number }[];
  byProvince: { province: string; total: number }[];
  byStatus: { status: string; count: number }[];
  topProducts: { name: string; units: number; revenue: number; profit: number }[];
}

const empty = (label: string): DashboardMetrics => ({
  label,
  grossRevenue: 0,
  collectedRevenue: 0,
  pendingRevenue: 0,
  orders: 0,
  paidOrders: 0,
  pendingOrders: 0,
  cancelledOrders: 0,
  deliveredOrders: 0,
  averageTicket: 0,
  unitsSold: 0,
  cogs: 0,
  grossMargin: 0,
  adSpend: 0,
  expensesTotal: 0,
  giftsCost: 0,
  netProfit: 0,
  cpa: 0,
  roas: 0,
  mer: 0,
  newCustomers: 0,
  lowStockCount: 0,
  byDay: [],
  bySize: [],
  byPaymentMethod: [],
  byProvince: [],
  byStatus: [],
  topProducts: [],
});

const PAYMENT_LABEL: Record<string, string> = {
  transfer: 'Transferencia',
  mercadopago: 'Mercado Pago',
  cash: 'Efectivo',
  other: 'Otro',
};

export async function getDashboardMetrics(key: RangeKey): Promise<DashboardMetrics> {
  const { from, to, label } = resolveRange(key);
  const result = empty(label);

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return result;
  }

  const fromIso = from.toISOString();
  const toIso = to.toISOString();

  // Workspace del usuario: el dueño ve web + lo suyo; un vendedor solo sus encargos/regalos.
  const profile = await getCurrentProfile();
  const sid = profile?.id ?? '00000000-0000-0000-0000-000000000000';
  const owner = profile ? isOwnerRole(profile.role) : false;
  const empties = { data: [] as any[] };

  const [{ data: ordersData }, { data: expensesData }, { data: adsData }, { data: lowStock }, { data: encargosData }, { data: giftsData }] =
    await Promise.all([
      owner
        ? supabase.from('orders').select('*, order_items(*)').gte('created_at', fromIso).lte('created_at', toIso)
        : Promise.resolve(empties),
      owner
        ? supabase.from('expenses').select('amount, category').gte('date', from.toISOString().slice(0, 10)).lte('date', to.toISOString().slice(0, 10))
        : Promise.resolve(empties),
      owner
        ? supabase.from('ad_metrics').select('spend, revenue').gte('date', from.toISOString().slice(0, 10)).lte('date', to.toISOString().slice(0, 10))
        : Promise.resolve(empties),
      owner ? supabase.from('variant_stock').select('low_stock').eq('low_stock', true) : Promise.resolve(empties),
      supabase
        .from('encargos')
        .select('paid, payment_status, paid_amount, status, created_at, items:encargo_items(product, size, quantity, sale_price, unit_cost)')
        .eq('seller_id', sid)
        .gte('created_at', fromIso)
        .lte('created_at', toIso),
      supabase
        .from('gifts')
        .select('quantity, unit_cost')
        .eq('seller_id', sid)
        .gte('created_at', fromIso)
        .lte('created_at', toIso),
    ]);

  const orders = (ordersData ?? []) as Order[];

  const dayMap = new Map<string, { revenue: number; orders: number; profit: number }>();
  const sizeMap = new Map<string, number>();
  const payMap = new Map<string, number>();
  const provMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  const productMap = new Map<string, { units: number; revenue: number; profit: number }>();

  for (const o of orders) {
    const isPaid = PAID_STATES.includes(o.payment_status);
    const isCancelled = ['cancelled', 'rejected'].includes(o.payment_status) || o.order_status === 'cancelled';
    result.orders += 1;
    result.grossRevenue += Number(o.subtotal) || 0;

    if (isPaid) {
      result.paidOrders += 1;
      result.collectedRevenue += Number(o.total) || 0;
      result.cogs += Number(o.estimated_cost) || 0;
    } else if (!isCancelled) {
      result.pendingOrders += 1;
      result.pendingRevenue += Number(o.total) || 0;
    }
    if (isCancelled) result.cancelledOrders += 1;
    if (o.order_status === 'delivered') result.deliveredOrders += 1;

    statusMap.set(o.order_status, (statusMap.get(o.order_status) || 0) + 1);

    if (isPaid) {
      const day = o.created_at.slice(0, 10);
      const profit = (Number(o.total) || 0) - (Number(o.estimated_cost) || 0);
      const dm = dayMap.get(day) || { revenue: 0, orders: 0, profit: 0 };
      dm.revenue += Number(o.total) || 0;
      dm.orders += 1;
      dm.profit += profit;
      dayMap.set(day, dm);

      const method = PAYMENT_LABEL[o.payment_method] || o.payment_method;
      payMap.set(method, (payMap.get(method) || 0) + (Number(o.total) || 0));

      if (o.province) provMap.set(o.province, (provMap.get(o.province) || 0) + (Number(o.total) || 0));

      for (const item of (o.order_items as OrderItem[]) || []) {
        result.unitsSold += item.quantity;
        if (item.size) sizeMap.set(item.size, (sizeMap.get(item.size) || 0) + item.quantity);
        const name = item.product_name || 'Producto';
        const pm = productMap.get(name) || { units: 0, revenue: 0, profit: 0 };
        pm.units += item.quantity;
        pm.revenue += Number(item.subtotal) || 0;
        pm.profit += (Number(item.unit_price) - Number(item.unit_cost)) * item.quantity;
        productMap.set(name, pm);
      }
    }
  }

  // Encargos (ventas por fuera de la web): se suman a facturación y ganancia.
  for (const e of (encargosData ?? []) as any[]) {
    if (e.status === 'cancelado') continue;
    let rev = 0, cost = 0, units = 0;
    for (const it of e.items ?? []) {
      rev += Number(it.sale_price) * it.quantity;
      cost += Number(it.unit_cost) * it.quantity;
      units += it.quantity;
    }
    result.orders += 1;
    result.grossRevenue += rev;
    // Cobrado real: total si pagado, monto de la seña si parcial, 0 si no pagó.
    const payStatus: string = e.payment_status ?? (e.paid ? 'paid' : 'unpaid');
    const collected =
      payStatus === 'paid' ? rev : payStatus === 'deposit' ? Math.min(Number(e.paid_amount) || 0, rev) : 0;
    const f = rev > 0 ? collected / rev : payStatus === 'paid' ? 1 : 0;
    if (f > 0) {
      result.paidOrders += 1;
      result.collectedRevenue += rev * f;
      result.cogs += cost * f;
      result.unitsSold += units;
      const day = (e.created_at || '').slice(0, 10);
      const dm = dayMap.get(day) || { revenue: 0, orders: 0, profit: 0 };
      dm.revenue += rev * f;
      dm.orders += 1;
      dm.profit += (rev - cost) * f;
      dayMap.set(day, dm);
      payMap.set('Encargos', (payMap.get('Encargos') || 0) + rev * f);
      for (const it of e.items ?? []) {
        if (it.size) sizeMap.set(it.size, (sizeMap.get(it.size) || 0) + it.quantity);
        const name = it.product || 'Encargo';
        const pm = productMap.get(name) || { units: 0, revenue: 0, profit: 0 };
        pm.units += it.quantity;
        pm.revenue += Number(it.sale_price) * it.quantity * f;
        pm.profit += (Number(it.sale_price) - Number(it.unit_cost)) * it.quantity * f;
        productMap.set(name, pm);
      }
    }
    if (f < 1) {
      result.pendingRevenue += rev * (1 - f);
      if (f === 0) result.pendingOrders += 1;
    }
  }

  result.adSpend = (adsData ?? []).reduce((acc, a) => acc + (Number(a.spend) || 0), 0);
  const adRevenue = (adsData ?? []).reduce((acc, a) => acc + (Number(a.revenue) || 0), 0);
  result.expensesTotal = (expensesData ?? []).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  result.lowStockCount = (lowStock ?? []).length;

  result.giftsCost = (giftsData ?? []).reduce(
    (acc, g: any) => acc + (Number(g.unit_cost) || 0) * (g.quantity || 0),
    0,
  );

  result.grossMargin = result.collectedRevenue - result.cogs;
  result.netProfit = result.grossMargin - result.adSpend - result.expensesTotal - result.giftsCost;
  result.averageTicket = result.paidOrders > 0 ? result.collectedRevenue / result.paidOrders : 0;
  result.cpa = result.paidOrders > 0 ? result.adSpend / result.paidOrders : 0;
  result.roas = result.adSpend > 0 ? adRevenue / result.adSpend : 0;
  result.mer = result.adSpend > 0 ? result.collectedRevenue / result.adSpend : 0;

  result.byDay = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));
  result.bySize = Array.from(sizeMap.entries())
    .map(([size, units]) => ({ size, units }))
    .sort((a, b) => b.units - a.units);
  result.byPaymentMethod = Array.from(payMap.entries()).map(([method, total]) => ({ method, total }));
  result.byProvince = Array.from(provMap.entries())
    .map(([province, total]) => ({ province, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);
  result.byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({ status, count }));
  result.topProducts = Array.from(productMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return result;
}
