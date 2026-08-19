'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter, logActivity } from '@/lib/admin/actions-helpers';
import { getAllSettings } from '@/lib/settings';
import { SAVINGS_DEFAULT, todayAr, type SavingsSettings } from '@/lib/admin/savings';

type Result = { ok?: boolean; error?: string };

async function guard(): Promise<Result | null> {
  try {
    await assertWriter();
    return null;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

async function current(): Promise<SavingsSettings> {
  const s = await getAllSettings();
  return { ...SAVINGS_DEFAULT, ...(s.savings || {}) } as SavingsSettings;
}

async function save(value: SavingsSettings): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('store_settings')
    .upsert(
      { key: 'savings', value_json: value, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );
  if (error) return { error: error.message };
  revalidatePath('/admin/ahorro');
  return { ok: true };
}

export interface GoalInput {
  name: string;
  target_amount: number;
  target_date: string;
  marketing_pct: number;
  reinvest_pct: number;
}

/** Define (o actualiza) la meta de ahorro. */
export async function saveGoal(input: GoalInput): Promise<Result> {
  const g = await guard();
  if (g) return g;

  const amount = Math.max(0, Math.round(Number(input.target_amount) || 0));
  if (amount <= 0) return { error: 'Ingresá cuánto querés ahorrar.' };
  if (!input.target_date) return { error: 'Elegí para cuándo querés tenerlo.' };
  if (input.target_date <= todayAr()) return { error: 'La fecha objetivo tiene que ser futura.' };

  const mk = Math.min(100, Math.max(0, Number(input.marketing_pct) || 0));
  const rv = Math.min(100, Math.max(0, Number(input.reinvest_pct) || 0));
  if (mk + rv > 100) return { error: 'Marketing y reinversión no pueden sumar más de 100%.' };

  const prev = await current();
  const res = await save({
    ...prev,
    active: true,
    name: (input.name || '').trim() || 'Mi ahorro',
    target_amount: amount,
    target_date: input.target_date,
    marketing_pct: mk,
    reinvest_pct: rv,
  });
  if (res.ok) await logActivity('update', 'savings_goal', null, { amount, to: input.target_date });
  return res;
}

/** Registra lo que efectivamente apartaste (o un retiro, con monto negativo). */
export async function addEntry(amount: number, note?: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const amt = Math.round(Number(amount) || 0);
  if (amt === 0) return { error: 'Ingresá un monto.' };

  const prev = await current();
  const entries = [
    { date: todayAr(), amount: amt, note: (note || '').trim() || undefined },
    ...(prev.entries ?? []),
  ].slice(0, 400);
  return save({ ...prev, entries });
}

/** Borra un movimiento por fecha + monto (el más reciente que coincida). */
export async function deleteEntry(date: string, amount: number): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const prev = await current();
  const idx = (prev.entries ?? []).findIndex(
    (e) => e.date === date && Math.round(Number(e.amount)) === Math.round(amount),
  );
  if (idx < 0) return { error: 'No se encontró ese movimiento.' };
  const entries = [...(prev.entries ?? [])];
  entries.splice(idx, 1);
  return save({ ...prev, entries });
}

/** Apaga el objetivo (deja de calcular y de notificar). */
export async function setActive(active: boolean): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const prev = await current();
  return save({ ...prev, active });
}
