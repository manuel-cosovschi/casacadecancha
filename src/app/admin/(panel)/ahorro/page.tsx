import { PageHeader, StatCard, EmptyState } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin/auth';
import { getAllSettings } from '@/lib/settings';
import { formatPrice } from '@/lib/utils';
import {
  SAVINGS_DEFAULT,
  computePlan,
  getWeekFinance,
  todayAr,
  weekRange,
  type SavingsSettings,
} from '@/lib/admin/savings';
import { GoalForm, EntryForm, EntriesList, PauseButton, Waterfall } from './AhorroPanel';

export const dynamic = 'force-dynamic';

export default async function AhorroPage() {
  await requireAdmin();
  const settings = await getAllSettings();
  const cfg: SavingsSettings = { ...SAVINGS_DEFAULT, ...(settings.savings || {}) };

  const hoy = todayAr();
  const { from, to } = weekRange(hoy);
  const week = await getWeekFinance(from, to);
  const plan = computePlan(cfg, week, hoy);

  const fmtDay = (d: string) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });

  if (!cfg.active || cfg.target_amount <= 0) {
    return (
      <div>
        <PageHeader
          title="Mis ahorros"
          description="Poné cuánto querés juntar y para cuándo. Todos los domingos a la noche te llega por notificación cuánto apartar de lo que vendiste esa semana."
        />
        <GoalForm cfg={cfg} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Mis ahorros"
        description={`${cfg.name} · objetivo ${formatPrice(plan.target)} para el ${new Date(
          `${cfg.target_date}T12:00:00Z`,
        ).toLocaleDateString('es-AR')}`}
        action={<GoalForm cfg={cfg} />}
      />

      {/* Progreso */}
      <div className="card mb-5 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-navy/50">Llevás ahorrado</p>
            <p className="text-3xl font-black text-navy">{formatPrice(plan.saved)}</p>
          </div>
          <p className="text-sm text-navy/60">
            Falta <strong className="text-navy">{formatPrice(plan.remaining)}</strong> en{' '}
            <strong className="text-navy">{plan.weeksLeft}</strong> semanas
          </p>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-navy/10">
          <div
            className="h-full rounded-full bg-green-600 transition-all"
            style={{ width: `${plan.progressPct}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-navy/50">{plan.progressPct.toFixed(1)}% del objetivo</p>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Apartar por semana"
          value={formatPrice(plan.weeklyQuota)}
          accent="green"
          hint="para llegar a tiempo"
        />
        <StatCard
          label="Ganancia de la semana"
          value={formatPrice(Math.max(0, plan.week.profit))}
          hint={`${plan.week.orders} venta${plan.week.orders === 1 ? '' : 's'} · ${plan.week.units} prendas`}
        />
        <StatCard
          label="Va al ahorro"
          value={formatPrice(plan.toSave)}
          accent={plan.covered ? 'green' : 'amber'}
          hint={plan.covered ? 'cuota cubierta' : `faltan ${formatPrice(plan.shortfall)}`}
        />
        <StatCard
          label="Tu sueldo"
          value={formatPrice(plan.toSalary)}
          accent={plan.toSalary > 0 ? 'navy' : 'red'}
          hint="después del ahorro"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Waterfall plan={plan} />

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
              Semana del {fmtDay(from)} al {fmtDay(to)}
            </h2>
            {plan.covered ? (
              <p className="mt-2 rounded-xl bg-green-50 p-3 text-sm text-green-800">
                ✅ Con lo de esta semana <strong>cubrís la cuota</strong>. Apartá{' '}
                <strong>{formatPrice(plan.toSave)}</strong> y seguís en camino para llegar a{' '}
                {formatPrice(plan.target)}.
              </p>
            ) : (
              <p className="mt-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                ⚠️ Esta semana <strong>no alcanza</strong> para la cuota de{' '}
                {formatPrice(plan.weeklyQuota)}. Apartá {formatPrice(plan.toSave)} igual: lo que
                falte se reparte entre las semanas que quedan.
                {plan.neededIncome > 0 && (
                  <>
                    {' '}
                    Para cubrirla necesitarías vender cerca de{' '}
                    <strong>{formatPrice(plan.neededIncome)}</strong> en la semana.
                  </>
                )}
              </p>
            )}
            <p className="mt-3 text-xs text-navy/50">
              El ahorro se aparta <strong>antes</strong> que tu sueldo: si una semana entra poco, el
              sueldo es lo que se achica, no la meta.
            </p>
            <div className="mt-3">
              <PauseButton active={cfg.active} />
            </div>
          </div>

          <EntryForm suggested={plan.toSave} />
        </div>
      </div>

      <div className="mt-5">
        {(cfg.entries ?? []).length > 0 ? (
          <EntriesList entries={cfg.entries} />
        ) : (
          <EmptyState message="Todavía no anotaste ningún ahorro. Cuando apartes la plata, registrala arriba." />
        )}
      </div>
    </div>
  );
}
