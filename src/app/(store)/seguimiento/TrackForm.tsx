'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TrackForm({ initial = '' }: { initial?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initial);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) return;
    router.push(`/seguimiento?code=${encodeURIComponent(clean)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Ej: CC7K3M9PQR"
        className="input flex-1"
        autoCapitalize="characters"
        spellCheck={false}
      />
      <button type="submit" className="btn-primary sm:w-auto">
        Seguir pedido
      </button>
    </form>
  );
}
