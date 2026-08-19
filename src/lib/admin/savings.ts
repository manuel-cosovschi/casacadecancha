import { createClient } from '@/lib/supabase/server';

/**
 * Ahorro objetivo: cuánto hay que apartar por semana para llegar a la meta,
 * y cómo se reparte lo que se ganó esa semana.
 *
 * Regla de oro (la pidió el dueño): el ahorro va ANTES que el sueldo.
 * Primero se repone la mercadería vendida, después se aparta la cuota de
 * ahorro, y recién con lo que sobra se cubren marketing, reinversión y sueldo.
 */

export interface SavingsEntry {
  date: string; // YYYY-MM-DD
  amount: number;
  note?: string;
}

export interface SavingsSettings {
  active: boolean;
  name: string;
  target_amount: number;
  target_date: string; // YYYY-MM-DD
  marketing_pct: number; // % de lo que queda DESPUÉS del ahorro
  reinvest_pct: number; // % de lo que queda DESPUÉS del ahorro
  entries: SavingsEntry[];
}

export const SAVINGS_DEFAULT: SavingsSettings = {
  active: false,
  name: 'Mi ahorro',
  target_amount: 0,
  target_date: '',
  marketing_pct: 15,
  reinvest_pct: 15,
  entries: [],
};

const AR_TZ = 'America/Argentina/Buenos_Aires';
const DAY = 86400000;

/** Fecha de hoy en Argentina (YYYY-MM-DD). */
export function todayAr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Semana (lunes a domingo) que contiene la fecha dada. */
export function weekRange(isoDate: string): { from: string; to: string } {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  const monday = new Date(d.getTime() - dow * DAY);
  const sunday = new Date(monday.getTime() + 6 * DAY);
  const fmt = (x: Date) => x.toISOString().slice(0, 10);
  return { from: fmt(monday), to: fmt(sunday) };
}

export interface WeekFinance {
  income: number; // lo que entró (cobrado)
  cogs: number; // costo de lo vendido: hay que reponerlo
  mpFee: number; // recargo que se queda Mercado Pago
  profit: number; // lo que realmente queda para repartir
  orders: number;
  units: number;
}

/** Plata que entró y costo de la mercadería, entre dos fechas (inclusive). */
export async function getWeekFinance(from: string, to: string): Promise<WeekFinance> {
  const empty: WeekFinance = { income: 0, cogs: 0, mpFee: 0, profit: 0, orders: 0, units: 0 };
  try {
    const supabase = await createClient();
    const fromIso = `${from}T00:00:00.000Z`;
    const toIso = `${to}T23:59:59.999Z`;

    const [{ data: orders }, { data: encargos }] = await Promise.all([
      supabase
        .from('orders')
        .select('total, subtotal, discount, shipping_cost, estimated_cost, payment_method, payment_status, order_items(quantity)')
        .eq('payment_status', 'paid')
        .gte('created_at', fromIso)
        .lte('created_at', toIso),
      supabase
        .from('encargos')
        .select('payment_status, paid, paid_amount, status, items:encargo_items(quantity, sale_price, unit_cost)')
        .gte('created_at', fromIso)
        .lte('created_at', toIso),
    ]);

    const r = { ...empty };

    for (const o of (orders ?? []) as any[]) {
      const total = Number(o.total) || 0;
      const base =
        (Number(o.subtotal) || 0) - (Number(o.discount) || 0) + (Number(o.shipping_cost) || 0);
      // El recargo de Mercado Pago es pass-through: no es plata del negocio.
      const fee = o.payment_method === 'mercadopago' ? Math.max(0, total - base) : 0;
      r.income += total;
      r.mpFee += fee;
      r.cogs += Number(o.estimated_cost) || 0;
      r.orders += 1;
      for (const it of (o.order_items ?? []) as any[]) r.units += it.quantity || 0;
    }

    for (const e of (encargos ?? []) as any[]) {
      const items = (e.items ?? []) as any[];
      const total = items.reduce((a, i) => a + (Number(i.sale_price) || 0) * (i.quantity || 0), 0);
      const cost = items.reduce((a, i) => a + (Number(i.unit_cost) || 0) * (i.quantity || 0), 0);
      if (total <= 0) continue;
      const ps = e.payment_status ?? (e.paid ? 'paid' : 'unpaid');
      const cobrado =
        ps === 'paid' ? total : ps === 'deposit' ? Math.min(Number(e.paid_amount) || 0, total) : 0;
      if (cobrado <= 0) continue;
      // Si sólo pagó una seña, contamos el costo en la misma proporción.
      const ratio = cobrado / total;
      r.income += cobrado;
      r.cogs += cost * ratio;
      r.orders += 1;
      for (const i of items) r.units += Math.round((i.quantity || 0) * ratio);
    }

    r.profit = r.income - r.cogs - r.mpFee;
    return r;
  } catch {
    return empty;
  }
}

export interface SavingsPlan {
  // Meta
  target: number;
  saved: number;
  remaining: number;
  progressPct: number;
  weeksLeft: number;
  weeklyQuota: number;
  // La semana
  week: WeekFinance;
  // Reparto
  restock: number; // reponer mercadería (sale de los ingresos)
  toSave: number;
  toMarketing: number;
  toReinvest: number;
  toSalary: number;
  shortfall: number; // lo que faltó para cubrir la cuota
  neededIncome: number; // ventas necesarias en la semana para cubrir la cuota
  covered: boolean;
}

/** Reparte lo ganado en la semana priorizando el ahorro. */
export function computePlan(
  cfg: SavingsSettings,
  week: WeekFinance,
  today = todayAr(),
): SavingsPlan {
  const target = Math.max(0, Number(cfg.target_amount) || 0);
  const saved = (cfg.entries ?? []).reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const remaining = Math.max(0, target - saved);

  // Semanas que faltan hasta la fecha objetivo (mínimo 1 para no dividir por cero).
  const msLeft = cfg.target_date
    ? new Date(`${cfg.target_date}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()
    : 0;
  const weeksLeft = Math.max(1, Math.ceil(msLeft / (7 * DAY)));
  const weeklyQuota = Math.round(remaining / weeksLeft);

  const profit = Math.max(0, week.profit);
  // 1) El ahorro se sirve primero.
  const toSave = Math.min(profit, weeklyQuota);
  const disponible = Math.max(0, profit - toSave);
  // 2) Con lo que queda: marketing, reinversión y por último el sueldo.
  const toMarketing = Math.round((disponible * (Number(cfg.marketing_pct) || 0)) / 100);
  const toReinvest = Math.round((disponible * (Number(cfg.reinvest_pct) || 0)) / 100);
  const toSalary = Math.max(0, disponible - toMarketing - toReinvest);

  // Cuánto habría que facturar en la semana para cubrir la cuota completa.
  const marginRatio = week.income > 0 ? week.profit / week.income : 0.3;
  const neededIncome = marginRatio > 0 ? Math.round(weeklyQuota / marginRatio) : 0;

  return {
    target,
    saved,
    remaining,
    progressPct: target > 0 ? Math.min(100, (saved / target) * 100) : 0,
    weeksLeft,
    weeklyQuota,
    week,
    restock: Math.round(week.cogs),
    toSave: Math.round(toSave),
    toMarketing,
    toReinvest,
    toSalary: Math.round(toSalary),
    shortfall: Math.max(0, weeklyQuota - Math.round(toSave)),
    neededIncome,
    covered: profit >= weeklyQuota,
  };
}
