'use client';

import { useState } from 'react';
import { EncargoCard } from './EncargoCard';
import type { MatrixRow, CatalogVariant } from './EncargoForm';

export function EncargosList({
  encargos,
  matrix,
  catalog,
}: {
  encargos: any[];
  matrix: MatrixRow[];
  catalog: CatalogVariant[];
}) {
  const [showDelivered, setShowDelivered] = useState(false);

  const enCurso = encargos.filter((e) => e.status !== 'entregado');
  const entregados = encargos.filter((e) => e.status === 'entregado');

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
          En curso <span className="text-navy/40">({enCurso.length})</span>
        </h2>
        {enCurso.length === 0 ? (
          <p className="rounded-xl bg-cream-soft/60 p-3 text-sm text-navy/50">No hay encargos pendientes. 🎉</p>
        ) : (
          enCurso.map((e) => <EncargoCard key={e.id} e={e} matrix={matrix} catalog={catalog} />)
        )}
      </div>

      {entregados.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowDelivered((s) => !s)}
            className="flex w-full items-center justify-between rounded-xl border border-navy/10 bg-cream-soft/60 px-4 py-2.5 text-sm font-bold uppercase tracking-wide text-navy/60 hover:bg-cream-soft"
          >
            <span>Entregados <span className="text-navy/40">({entregados.length})</span></span>
            <span className="text-xs font-semibold normal-case text-navy/50">
              {showDelivered ? 'Ocultar ▲' : 'Mostrar ▼'}
            </span>
          </button>
          {showDelivered && entregados.map((e) => (
            <EncargoCard key={e.id} e={e} matrix={matrix} catalog={catalog} />
          ))}
        </div>
      )}
    </div>
  );
}
