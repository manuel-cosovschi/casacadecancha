'use client';

import { useState, useTransition } from 'react';
import { marcarEstado } from '@/app/admin/(panel)/presupuestos/actions';

const OPCIONES = [
  { valor: 'enviado', texto: 'Esperando', clase: 'bg-amber-100 text-amber-800' },
  { valor: 'aceptado', texto: 'Aceptado', clase: 'bg-green-100 text-green-800' },
  { valor: 'rechazado', texto: 'No compró', clase: 'bg-navy/8 text-navy/50' },
] as const;

/**
 * En qué terminó el presupuesto.
 *
 * Existe para que la cuenta de "cuántos cerrás" signifique algo: sin marcar el
 * resultado, la lista solo dice cuántos mandaste.
 */
export function EstadoPresupuesto({ numero, estado }: { numero: string; estado: string }) {
  const [actual, setActual] = useState(estado);
  const [pendiente, startTransition] = useTransition();

  const opcion = OPCIONES.find((o) => o.valor === actual) ?? OPCIONES[0];

  function cambiar(valor: string) {
    setActual(valor);
    startTransition(() => {
      void marcarEstado(numero, valor as 'enviado' | 'aceptado' | 'rechazado');
    });
  }

  return (
    <select
      value={actual}
      onChange={(e) => cambiar(e.target.value)}
      disabled={pendiente}
      aria-label={`Estado de ${numero}`}
      className={`badge cursor-pointer border-0 ${opcion.clase} ${pendiente ? 'opacity-50' : ''}`}
    >
      {OPCIONES.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.texto}
        </option>
      ))}
    </select>
  );
}
