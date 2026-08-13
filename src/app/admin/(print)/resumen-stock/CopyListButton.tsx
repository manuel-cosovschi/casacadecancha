'use client';

import { useState } from 'react';

/** Copia la lista en texto para pegarla en WhatsApp (respuesta rápida). */
export function CopyListButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Safari viejo / permisos: fallback con textarea temporal.
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  }

  return (
    <button type="button" onClick={copy} className="btn-outline !py-2 w-full sm:w-auto">
      {ok ? '¡Copiado! ✔' : 'Copiar lista para WhatsApp'}
    </button>
  );
}
