'use client';

import { useState } from 'react';

/** Dato copiable de un toque (alias, CBU, monto). */
export function CopyField({
  label,
  value,
  hint,
  big,
}: {
  label: string;
  value: string;
  hint?: string;
  big?: boolean;
}) {
  const [ok, setOk] = useState(false);
  if (!value) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-navy/15 bg-cream-soft px-4 py-3 text-left transition hover:border-navy/35"
    >
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-navy/45">
          {label}
        </span>
        <span
          className={`block truncate font-mono text-navy ${big ? 'text-lg font-bold' : 'text-sm font-semibold'}`}
        >
          {hint || value}
        </span>
      </span>
      <span className="shrink-0 text-xs font-bold text-celeste-bright">
        {ok ? '¡Copiado! ✔' : 'Copiar'}
      </span>
    </button>
  );
}
