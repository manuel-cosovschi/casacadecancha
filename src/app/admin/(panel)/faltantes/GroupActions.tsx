'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markStockNotified, deleteStockRequest } from './actions';

export function MarkGroupButton({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { await markStockNotified(ids, true); router.refresh(); })}
      disabled={pending}
      className="rounded-lg border border-navy/20 px-2.5 py-1.5 text-xs font-semibold text-navy transition hover:bg-navy hover:text-cream"
    >
      {pending ? '…' : '✓ Marcar avisados'}
    </button>
  );
}

export function DeleteRequestButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { await deleteStockRequest(id); router.refresh(); })}
      disabled={pending}
      className="text-xs font-semibold text-red-600 hover:underline"
      title="Eliminar"
    >
      ✕
    </button>
  );
}

export function ReopenButton({ ids }: { ids: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { await markStockNotified(ids, false); router.refresh(); })}
      disabled={pending}
      className="text-xs font-semibold text-navy/50 hover:underline"
    >
      {pending ? '…' : 'reabrir'}
    </button>
  );
}
