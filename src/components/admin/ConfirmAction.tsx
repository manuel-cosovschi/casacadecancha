'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/** Botón que ejecuta una server action (ya “bindeada”) con confirmación. */
export function ConfirmAction({
  action,
  label = 'Eliminar',
  confirmText = '¿Confirmás esta acción?',
  className = 'text-xs font-semibold text-red-600 hover:underline',
}: {
  action: () => Promise<{ error?: string; ok?: boolean }>;
  label?: string;
  confirmText?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [, setError] = useState<string | null>(null);

  function run() {
    if (!confirm(confirmText)) return;
    startTransition(async () => {
      const res = await action();
      if (res?.error) {
        setError(res.error);
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button onClick={run} disabled={pending} className={className}>
      {pending ? '…' : label}
    </button>
  );
}
