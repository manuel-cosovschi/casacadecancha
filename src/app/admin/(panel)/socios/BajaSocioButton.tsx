'use client';

import { useState, useTransition } from 'react';
import { darDeBajaSocio } from './actions';

/** Dar de baja corta beneficios, así que pregunta antes. */
export function BajaSocioButton({ id, nombre }: { id: string; nombre: string }) {
  const [pendiente, startTransition] = useTransition();
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        onClick={() => setConfirmando(true)}
        className="text-xs font-semibold text-navy/50 hover:text-red-700 hover:underline"
      >
        Dar de baja
      </button>
    );
  }

  return (
    <span className="whitespace-nowrap text-xs">
      <span className="text-navy/60">¿Baja de {nombre}?</span>{' '}
      <button
        onClick={() => startTransition(async () => { await darDeBajaSocio(id); })}
        disabled={pendiente}
        className="font-bold text-red-700 hover:underline"
      >
        {pendiente ? '…' : 'Sí'}
      </button>{' '}
      <button onClick={() => setConfirmando(false)} className="text-navy/50 hover:underline">
        No
      </button>
    </span>
  );
}
