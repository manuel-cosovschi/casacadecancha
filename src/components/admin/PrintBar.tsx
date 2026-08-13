'use client';

import Link from 'next/link';

/** Barra de acciones de las hojas imprimibles (no sale en el PDF). */
export function PrintBar({ back, hint }: { back: string; hint?: string }) {
  return (
    <div className="mx-auto mb-4 flex max-w-[820px] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
      <Link href={back} className="text-sm font-semibold text-navy/60 hover:text-navy">
        ← Volver
      </Link>
      <div className="flex items-center gap-3">
        {hint && <span className="hidden text-xs text-navy/50 sm:inline">{hint}</span>}
        <button type="button" onClick={() => window.print()} className="btn-primary !py-2">
          Guardar PDF / Imprimir
        </button>
      </div>
    </div>
  );
}
