'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import type { SavingsPlan, SavingsSettings } from '@/lib/admin/savings';
import { saveGoal, addEntry, deleteEntry, setActive } from './actions';

export function GoalForm({ cfg }: { cfg: SavingsSettings }) {
  const router = useRouter();
  const [open, setOpen] = useState(!cfg.active);
  const [name, setName] = useState(cfg.name);
  const [amount, setAmount] = useState(cfg.target_amount ? String(cfg.target_amount) : '');
  const [date, setDate] = useState(cfg.target_date || '');
  const [mk, setMk] = useState(String(cfg.marketing_pct));
  const [rv, setRv] = useState(String(cfg.reinvest_pct));
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();

  // Atajo: en vez de elegir una fecha, decir "en X meses".
  function inMonths(m: number) {
    const d = new Date();
    d.setMonth(d.getMonth() + m);
    setDate(d.toISOString().slice(0, 10));
  }

  function submit() {
    setErr(null);
    start(async () => {
      const res = await saveGoal({
        name,
        target_amount: Number(amount),
        target_date: date,
        marketing_pct: Number(mk),
        reinvest_pct: Number(rv),
      });
      if (res.error) setErr(res.error);
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-outline !py-2">
        Editar objetivo
      </button>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">
        {cfg.active ? 'Editar objetivo' : 'Definí tu objetivo de ahorro'}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Para qué es</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Auto, viaje, fondo" />
        </div>
        <div>
          <label className="label">Cuánto querés juntar</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="7000000"
          />
        </div>
        <div>
          <label className="label">Para cuándo</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[6, 12, 15, 24].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => inMonths(m)}
                className="rounded-full border border-navy/15 px-2.5 py-1 text-xs font-semibold text-navy/70 hover:border-navy"
              >
                {m} meses
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Marketing (% de lo que sobra)</label>
          <input className="input" type="number" value={mk} onChange={(e) => setMk(e.target.value)} />
        </div>
        <div>
          <label className="label">Reinversión (% de lo que sobra)</label>
          <input className="input" type="number" value={rv} onChange={(e) => setRv(e.target.value)} />
        </div>
      </div>
      <p className="mt-2 text-xs text-navy/50">
        Esos porcentajes se aplican a lo que queda <strong>después</strong> de apartar el ahorro. El
        resto es tu sueldo.
      </p>
      {err && <p className="mt-3 text-sm font-semibold text-red-600">{err}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={submit} disabled={busy} className="btn-primary !py-2">
          {busy ? 'Guardando…' : 'Guardar objetivo'}
        </button>
        {cfg.active && (
          <button onClick={() => setOpen(false)} className="btn-outline !py-2">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

export function EntryForm({ suggested }: { suggested: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();

  function submit() {
    setErr(null);
    start(async () => {
      const res = await addEntry(Number(amount), note);
      if (res.error) setErr(res.error);
      else {
        setAmount('');
        setNote('');
        router.refresh();
      }
    });
  }

  return (
    <div className="card p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Registrar ahorro</h2>
      <p className="mt-1 text-sm text-navy/60">
        Cuando apartes la plata, anotala acá. Con eso se recalcula la cuota de las semanas que
        quedan.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[140px] flex-1">
          <label className="label">Monto</label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(suggested || 0)}
          />
        </div>
        <div className="min-w-[160px] flex-[2]">
          <label className="label">Nota (opcional)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: semana del 11 al 17" />
        </div>
        <button onClick={submit} disabled={busy} className="btn-primary !py-2">
          {busy ? '…' : 'Anotar'}
        </button>
      </div>
      {suggested > 0 && (
        <button
          type="button"
          onClick={() => setAmount(String(suggested))}
          className="mt-2 text-xs font-semibold text-celeste-bright hover:underline"
        >
          Usar lo sugerido de esta semana ({formatPrice(suggested)})
        </button>
      )}
      {err && <p className="mt-2 text-sm font-semibold text-red-600">{err}</p>}
    </div>
  );
}

export function EntriesList({ entries }: { entries: { date: string; amount: number; note?: string }[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  if (entries.length === 0) return null;

  return (
    <div className="card p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">
        Movimientos ({entries.length})
      </h2>
      <ul className="divide-y divide-navy/5">
        {entries.slice(0, 30).map((e, i) => (
          <li key={`${e.date}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
            <div className="min-w-0">
              <span className={`font-bold ${e.amount < 0 ? 'text-red-600' : 'text-green-700'}`}>
                {e.amount < 0 ? '' : '+'}
                {formatPrice(e.amount)}
              </span>
              {e.note && <span className="ml-2 text-navy/50">{e.note}</span>}
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="text-xs text-navy/45">
                {new Date(`${e.date}T12:00:00Z`).toLocaleDateString('es-AR')}
              </span>
              <button
                onClick={() =>
                  start(async () => {
                    await deleteEntry(e.date, e.amount);
                    router.refresh();
                  })
                }
                disabled={busy}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Borrar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PauseButton({ active }: { active: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          await setActive(!active);
          router.refresh();
        })
      }
      disabled={busy}
      className="text-xs font-semibold text-navy/50 hover:text-navy hover:underline"
    >
      {active ? 'Pausar objetivo' : 'Reactivar objetivo'}
    </button>
  );
}

/** El reparto de la semana, explicado en orden de prioridad. */
export function Waterfall({ plan }: { plan: SavingsPlan }) {
  const rows = [
    {
      k: 'Reponer stock',
      v: plan.restock,
      d: 'Lo que costó la mercadería que vendiste. Esta plata vuelve al negocio sí o sí.',
      tone: 'navy',
    },
    {
      k: '1º Ahorro',
      v: plan.toSave,
      d: plan.covered
        ? 'Tu cuota de esta semana, cubierta.'
        : `Se apartó todo lo que se pudo. Faltaron ${formatPrice(plan.shortfall)} para la cuota.`,
      tone: plan.covered ? 'green' : 'amber',
    },
    { k: '2º Marketing', v: plan.toMarketing, d: 'Para publicidad.', tone: 'navy' },
    { k: '3º Reinversión', v: plan.toReinvest, d: 'Para sumar modelos nuevos.', tone: 'navy' },
    {
      k: '4º Tu sueldo',
      v: plan.toSalary,
      d: plan.toSalary > 0 ? 'Lo que te queda a vos esta semana.' : 'Esta semana el ahorro se llevó todo.',
      tone: plan.toSalary > 0 ? 'green' : 'red',
    },
  ];
  const color = (t: string) =>
    t === 'green' ? 'text-green-700' : t === 'amber' ? 'text-amber-600' : t === 'red' ? 'text-red-600' : 'text-navy';

  return (
    <div className="card p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
        Cómo repartir lo de esta semana
      </h2>
      <div className="mt-3 space-y-1 border-b border-navy/10 pb-3 text-sm">
        <div className="flex justify-between">
          <span className="text-navy/60">Entró (cobrado)</span>
          <span className="font-semibold">{formatPrice(plan.week.income)}</span>
        </div>
        {plan.week.mpFee > 0 && (
          <div className="flex justify-between text-navy/50">
            <span>− Se queda Mercado Pago</span>
            <span>{formatPrice(plan.week.mpFee)}</span>
          </div>
        )}
        <div className="flex justify-between text-navy/50">
          <span>− Costo de la mercadería</span>
          <span>{formatPrice(plan.restock)}</span>
        </div>
        <div className="flex justify-between border-t border-navy/10 pt-1.5 text-base">
          <span className="font-bold">Ganancia real</span>
          <span className="font-extrabold">{formatPrice(Math.max(0, plan.week.profit))}</span>
        </div>
      </div>

      <ul className="mt-3 space-y-2.5">
        {rows.slice(1).map((r) => (
          <li key={r.k} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-sm font-bold ${color(r.tone)}`}>{r.k}</p>
              <p className="text-xs text-navy/55">{r.d}</p>
            </div>
            <span className={`shrink-0 text-lg font-extrabold ${color(r.tone)}`}>
              {formatPrice(r.v)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
