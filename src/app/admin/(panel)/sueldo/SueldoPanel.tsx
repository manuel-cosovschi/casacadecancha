'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateSetting } from '../_settings-actions';
import { formatPrice } from '@/lib/utils';

export function SueldoPanel({
  inventoryCost,
  inventoryUnits,
  pendingCollect,
  initial,
}: {
  inventoryCost: number;
  inventoryUnits: number;
  pendingCollect: number;
  initial: { cash: number; reinvestPct: number; restockPct: number };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [cash, setCash] = useState(initial.cash);
  const [reinvest, setReinvest] = useState(initial.reinvestPct);
  const [restock, setRestock] = useState(initial.restockPct);

  const calc = useMemo(() => {
    const c = Math.max(0, cash);
    const rp = Math.min(100, Math.max(0, reinvest));
    const sp = Math.min(100, Math.max(0, restock));
    const totalPct = Math.min(100, rp + sp);
    const marketing = Math.round((c * rp) / 100);
    const restockAmt = Math.round((c * sp) / 100);
    const salary = Math.max(0, c - marketing - restockAmt);
    return { c, marketing, restockAmt, salary, over: rp + sp > 100, totalPct };
  }, [cash, reinvest, restock]);

  function save() {
    start(async () => {
      await updateSetting('finance', { cash, reinvest_pct: reinvest, restock_pct: restock });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {/* Entrada */}
      <div className="card h-fit p-5 lg:col-span-1">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Tus datos</h2>
        <label className="mt-4 block">
          <span className="label">Plata líquida en la cuenta hoy</span>
          <input
            type="number"
            value={cash || ''}
            onChange={(e) => setCash(Number(e.target.value))}
            className="input"
            placeholder="Ej: 500000"
          />
          <span className="mt-1 block text-xs text-navy/50">Lo que tenés disponible en efectivo/Mercado Pago/banco.</span>
        </label>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="label">% Marketing</span>
            <input type="number" value={reinvest} onChange={(e) => setReinvest(Number(e.target.value))} className="input" />
          </label>
          <label className="block">
            <span className="label">% Reponer stock</span>
            <input type="number" value={restock} onChange={(e) => setRestock(Number(e.target.value))} className="input" />
          </label>
        </div>
        {calc.over && (
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs font-medium text-amber-700">
            Los porcentajes suman más de 100%. Bajá alguno.
          </p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="btn-primary mt-4 w-full"
        >
          {saved ? '✓ Guardado' : pending ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {/* Resultado */}
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Big label="Tu sueldo (podés retirar)" value={formatPrice(calc.salary)} tone="green" />
          <Big label="Reponer stock" value={formatPrice(calc.restockAmt)} tone="navy" />
          <Big label="Marketing / crecimiento" value={formatPrice(calc.marketing)} tone="celeste" />
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Cómo se reparte tu plata líquida</h2>
          <Bar salary={calc.salary} restock={calc.restockAmt} marketing={calc.marketing} total={calc.c} />
          <ul className="mt-4 space-y-1.5 text-sm">
            <Row label="🟢 Tuyo (sueldo)" value={formatPrice(calc.salary)} />
            <Row label="🔵 Reponer stock (del negocio)" value={formatPrice(calc.restockAmt)} />
            <Row label="🔷 Marketing (del negocio)" value={formatPrice(calc.marketing)} />
          </ul>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Contexto del negocio</h2>
          <ul className="space-y-1.5 text-sm">
            <Row label="Plata en stock sin vender (a costo)" value={formatPrice(inventoryCost)} muted />
            <Row label="Unidades disponibles (sin vender)" value={`${inventoryUnits} u.`} muted />
            <Row label="Por cobrar (encargos con seña/pendientes)" value={formatPrice(pendingCollect)} muted />
          </ul>
          <p className="mt-3 text-xs text-navy/50">
            Es el stock que todavía no vendiste (no cuenta lo ya reservado para encargos). Esa plata ya es
            del negocio (está en productos, no es líquida). Tu sueldo sale de la plata líquida.
          </p>
        </div>
      </div>
    </div>
  );
}

function Big({ label, value, tone }: { label: string; value: string; tone: 'green' | 'navy' | 'celeste' }) {
  const bg = tone === 'green' ? 'bg-green-50' : tone === 'celeste' ? 'bg-celeste/15' : 'bg-navy/5';
  const fg = tone === 'green' ? 'text-green-700' : 'text-navy';
  return (
    <div className={`rounded-2xl p-4 ${bg}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-navy/50">{label}</p>
      <p className={`mt-1 text-2xl font-black ${fg}`}>{value}</p>
    </div>
  );
}

function Bar({ salary, restock, marketing, total }: { salary: number; restock: number; marketing: number; total: number }) {
  const t = total > 0 ? total : 1;
  const s = (salary / t) * 100;
  const r = (restock / t) * 100;
  const m = (marketing / t) * 100;
  return (
    <div className="flex h-4 overflow-hidden rounded-full bg-navy/10">
      <div style={{ width: `${s}%` }} className="bg-green-500" />
      <div style={{ width: `${r}%` }} className="bg-navy" />
      <div style={{ width: `${m}%` }} className="bg-celeste" />
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <li className="flex justify-between gap-3">
      <span className={muted ? 'text-navy/60' : 'text-navy/80'}>{label}</span>
      <span className="font-semibold text-navy">{value}</span>
    </li>
  );
}
