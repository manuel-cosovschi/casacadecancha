'use client';

import { useState } from 'react';
import { formatPrice } from '@/lib/utils';

/** Calculadora de precios y CPA máximo admisible. */
export function PriceCalculator() {
  const [cost, setCost] = useState(12000);
  const [packaging, setPackaging] = useState(800);
  const [commission, setCommission] = useState(6); // % Mercado Pago
  const [shipping, setShipping] = useState(0); // envío absorbido
  const [adsPct, setAdsPct] = useState(15); // % de publicidad esperado sobre precio
  const [margin, setMargin] = useState(40); // margen deseado %

  const baseCost = cost + packaging + shipping;
  // Precio recomendado: cubrir costos + comisión + ads + margen.
  // precio = baseCost / (1 - (commission + adsPct + margin)/100)
  const denom = 1 - (commission + adsPct + margin) / 100;
  const recommended = denom > 0 ? baseCost / denom : 0;
  const minDenom = 1 - (commission + adsPct) / 100; // sin margen
  const minPrice = minDenom > 0 ? baseCost / minDenom : 0;
  const commissionAmount = (recommended * commission) / 100;
  const profitPerUnit = recommended - baseCost - commissionAmount - (recommended * adsPct) / 100;
  const marginPct = recommended > 0 ? (profitPerUnit / recommended) * 100 : 0;
  // CPA máximo admisible: ganancia por unidad antes de ads.
  const grossPerUnit = recommended - baseCost - commissionAmount;

  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">Calculadora de precios</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-3">
          <Num label="Costo del producto" value={cost} onChange={setCost} />
          <Num label="Packaging" value={packaging} onChange={setPackaging} />
          <Num label="Comisión Mercado Pago (%)" value={commission} onChange={setCommission} />
          <Num label="Envío absorbido" value={shipping} onChange={setShipping} />
          <Num label="Publicidad esperada (%)" value={adsPct} onChange={setAdsPct} />
          <Num label="Margen deseado (%)" value={margin} onChange={setMargin} />
        </div>
        <div className="grid content-start gap-3">
          <Out label="Precio mínimo (sin margen)" value={formatPrice(minPrice)} />
          <Out label="Precio recomendado" value={formatPrice(recommended)} highlight />
          <Out label="CPA máximo admisible" value={formatPrice(grossPerUnit)} hint="Lo máximo que podés gastar en ads por venta sin perder" />
          <Out label="Ganancia por unidad" value={formatPrice(profitPerUnit)} accent={profitPerUnit >= 0} />
          <Out label="Margen porcentual" value={`${marginPct.toFixed(1)}%`} />
        </div>
      </div>
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="text-sm">
      <span className="label">{label}</span>
      <input type="number" min="0" value={value} onChange={(e) => onChange(Number(e.target.value))} className="input" />
    </label>
  );
}

function Out({ label, value, highlight, accent, hint }: { label: string; value: string; highlight?: boolean; accent?: boolean; hint?: string }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-navy bg-navy text-cream' : 'border-navy/15'}`}>
      <p className={`text-xs uppercase tracking-wide ${highlight ? 'text-celeste' : 'text-navy/50'}`}>{label}</p>
      <p className={`text-lg font-extrabold ${accent === false ? 'text-red-500' : ''}`}>{value}</p>
      {hint && <p className={`text-xs ${highlight ? 'text-cream/70' : 'text-navy/50'}`}>{hint}</p>}
    </div>
  );
}
