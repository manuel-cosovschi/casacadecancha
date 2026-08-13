'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setCobroStatus, deleteCobro } from './actions';

export function CobroActions({
  id,
  status,
  url,
}: {
  id: string;
  status: string;
  url: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const change = (s: 'pendiente' | 'cobrado' | 'cancelado') =>
    start(async () => {
      await setCobroStatus(id, s);
      router.refresh();
    });

  const remove = () =>
    start(async () => {
      if (!confirm('¿Borrar este cobro?')) return;
      await deleteCobro(id);
      router.refresh();
    });

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button onClick={copyLink} className="btn-outline !py-1.5 !px-3 text-xs">
        {copied ? '¡Copiado! ✔' : 'Copiar link'}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(`Para abonar entrá acá: ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-wsp !py-1.5 !px-3 text-xs"
      >
        Enviar por WhatsApp
      </a>
      {status !== 'cobrado' ? (
        <button
          onClick={() => change('cobrado')}
          disabled={pending}
          className="badge bg-green-100 text-green-800 hover:bg-green-200"
        >
          ✓ Marcar cobrado
        </button>
      ) : (
        <button
          onClick={() => change('pendiente')}
          disabled={pending}
          className="badge border border-navy/20 text-navy/60"
        >
          Volver a pendiente
        </button>
      )}
      <button onClick={remove} disabled={pending} className="ml-auto text-xs font-semibold text-red-600 hover:underline">
        Borrar
      </button>
    </div>
  );
}
