'use client';

import { useState } from 'react';
import type { FAQ } from '@/lib/types';

export function FaqAccordion({ faqs }: { faqs: FAQ[] }) {
  const [open, setOpen] = useState<string | null>(faqs[0]?.id ?? null);
  if (faqs.length === 0) return null;

  return (
    <div className="mx-auto max-w-3xl divide-y divide-navy/10 rounded-2xl border border-navy/10 bg-white">
      {faqs.map((faq) => {
        const isOpen = open === faq.id;
        return (
          <div key={faq.id}>
            <button
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              onClick={() => setOpen(isOpen ? null : faq.id)}
              aria-expanded={isOpen}
            >
              <span className="text-sm font-semibold text-navy">{faq.question}</span>
              <span className={`text-celeste transition-transform ${isOpen ? 'rotate-45' : ''}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </button>
            {isOpen && (
              <p className="px-5 pb-5 text-sm leading-relaxed text-navy/70">{faq.answer}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
