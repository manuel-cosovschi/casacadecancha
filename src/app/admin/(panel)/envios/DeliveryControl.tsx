'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setDeliveryStatus } from './actions';
import { DELIVERY_STEPS, normalizeDeliveryStatus, type DeliveryStatus } from '@/lib/delivery';

export function DeliveryControl({
  orderId,
  current,
}: {
  orderId: string;
  current: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [value, setValue] = useState<DeliveryStatus>(normalizeDeliveryStatus(current));

  function update(status: DeliveryStatus) {
    setValue(status);
    start(async () => {
      await setDeliveryStatus(orderId, status);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {DELIVERY_STEPS.map((step) => {
        const active = value === step.key;
        return (
          <button
            key={step.key}
            onClick={() => update(step.key)}
            disabled={pending}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              active
                ? 'bg-navy text-cream'
                : 'border border-navy/20 text-navy hover:bg-navy/5'
            }`}
          >
            {step.emoji} {step.label}
          </button>
        );
      })}
    </div>
  );
}
