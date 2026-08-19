import { NextResponse } from 'next/server';
import { getAllSettings } from '@/lib/settings';
import { sendAdminPush } from '@/lib/push';
import {
  SAVINGS_DEFAULT,
  computePlan,
  getWeekFinance,
  todayAr,
  weekRange,
  type SavingsSettings,
} from '@/lib/admin/savings';

/**
 * Cron: resumen de ahorro de la semana.
 * Corre los domingos a la noche (ver vercel.json) y manda una push con
 * cuánto apartar de lo que se ganó esa semana. Protegido con CRON_SECRET.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }
  }

  const settings = await getAllSettings();
  const cfg: SavingsSettings = { ...SAVINGS_DEFAULT, ...(settings.savings || {}) };
  if (!cfg.active || !(cfg.target_amount > 0) || !cfg.target_date) {
    return NextResponse.json({ ok: true, skipped: 'sin objetivo activo' });
  }

  const hoy = todayAr();
  const { from, to } = weekRange(hoy);
  const week = await getWeekFinance(from, to);
  const plan = computePlan(cfg, week, hoy);

  const money = (n: number) =>
    `$${Math.round(n).toLocaleString('es-AR')}`;

  let title: string;
  let body: string;

  if (week.income <= 0) {
    title = '💰 Semana sin ventas';
    body = `No entró plata esta semana, así que no hay nada para apartar. Tu cuota sigue en ${money(
      plan.weeklyQuota,
    )} por semana.`;
  } else if (plan.covered) {
    title = `💰 Apartá ${money(plan.toSave)} esta semana`;
    body = `Ganancia ${money(week.profit)} → ahorro ${money(plan.toSave)} · marketing ${money(
      plan.toMarketing,
    )} · reinversión ${money(plan.toReinvest)} · tu sueldo ${money(plan.toSalary)}.`;
  } else {
    title = `💰 Apartá ${money(plan.toSave)} (falta para la cuota)`;
    body = `Ganancia ${money(week.profit)}. La cuota era ${money(
      plan.weeklyQuota,
    )}: faltaron ${money(plan.shortfall)}. El ahorro va primero, tu sueldo queda en ${money(
      plan.toSalary,
    )}.`;
  }

  await sendAdminPush(title, body, '/admin/ahorro', 'cdc-ahorro');

  return NextResponse.json({
    ok: true,
    week: { from, to, income: week.income, profit: week.profit },
    plan: {
      quota: plan.weeklyQuota,
      toSave: plan.toSave,
      toMarketing: plan.toMarketing,
      toReinvest: plan.toReinvest,
      toSalary: plan.toSalary,
      covered: plan.covered,
    },
  });
}
