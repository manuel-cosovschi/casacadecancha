'use client';

import { useState } from 'react';

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* ignore */
        }
      }}
      className="rounded-lg border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-navy hover:text-cream"
    >
      {copied ? '¡Copiado!' : label}
    </button>
  );
}
