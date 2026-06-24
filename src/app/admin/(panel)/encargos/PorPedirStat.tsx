'use client';

import { useState } from 'react';

interface Row {
  product: string;
  size: string;
  faltan: number;
  who: { name: string; qty: number }[];
}

export function PorPedirStat({ total, detalle }: { total: number; detalle: Row[] }) {
  const [open, setOpen] = useState(false);
  const clickable = total > 0 && detalle.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => clickable && setOpen(true)}
        className={`card p-4 text-left ${clickable ? 'cursor-pointer transition hover:shadow-lift' : 'cursor-default'}`}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-navy/50">Unidades por pedir</p>
        <p className={`mt-1 text-xl font-extrabold ${total > 0 ? 'text-amber-600' : 'text-green-600'}`}>{total}</p>
        <p className="mt-0.5 text-xs text-navy/50">{clickable ? 'Tocá para ver qué pedir' : 'al proveedor'}</p>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-navy">Tenés que pedir al proveedor</h2>
              <button onClick={() => setOpen(false)} className="text-navy/50 hover:text-navy">✕</button>
            </div>
            <ul className="space-y-3">
              {detalle.map((r, idx) => (
                <li key={idx} className="rounded-xl border border-navy/10 p-3">
                  <p className="text-sm font-bold text-navy">
                    {r.faltan}× {r.product}{r.size ? ` · Talle ${r.size}` : ''}
                  </p>
                  {r.who.length > 0 && (
                    <p className="mt-1 text-xs text-navy/60">
                      Para: {r.who.map((w) => `${w.name}${w.qty > 1 ? ` (${w.qty})` : ''}`).join(' · ')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <button onClick={() => setOpen(false)} className="btn-primary mt-4 w-full !py-2">Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}
