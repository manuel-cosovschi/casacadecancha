'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const RANGES = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'last7', label: '7 días' },
  { key: 'last30', label: '30 días' },
  { key: 'this_month', label: 'Este mes' },
  { key: 'last_month', label: 'Mes anterior' },
];

export function RangeSelector({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function select(key: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set('range', key);
    router.push(`/admin?${sp.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {RANGES.map((r) => (
        <button
          key={r.key}
          onClick={() => select(r.key)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            current === r.key
              ? 'bg-navy text-cream'
              : 'border border-navy/20 text-navy hover:bg-navy/5'
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
