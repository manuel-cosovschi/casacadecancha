'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setCarrierInfo } from './actions';

export function CarrierForm({
  orderId,
  carrier,
  trackingCode,
}: {
  orderId: string;
  carrier: string | null;
  trackingCode: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [c, setC] = useState(carrier || 'Correo Argentino');
  const [t, setT] = useState(trackingCode || '');
  const [saved, setSaved] = useState(false);

  function save() {
    start(async () => {
      await setCarrierInfo(orderId, c, t);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <label className="text-xs">
        <span className="mb-0.5 block text-navy/50">Correo</span>
        <input
          value={c}
          onChange={(e) => setC(e.target.value)}
          className="input !py-1.5 !text-sm"
          placeholder="Correo Argentino"
        />
      </label>
      <label className="text-xs">
        <span className="mb-0.5 block text-navy/50">Código de seguimiento</span>
        <input
          value={t}
          onChange={(e) => setT(e.target.value)}
          className="input !py-1.5 !text-sm"
          placeholder="Ej: CX123456789AR"
        />
      </label>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-cream hover:bg-navy/90 disabled:opacity-60"
      >
        {saved ? '✓ Guardado' : pending ? 'Guardando…' : 'Guardar'}
      </button>
    </div>
  );
}
