'use client';

import { whatsappLink } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import type { WhatsAppSettings } from '@/lib/types';

export function WhatsAppButton({ data }: { data: WhatsAppSettings }) {
  if (!data?.active) return null;
  return (
    <a
      href={whatsappLink(data.number, data.default_message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent('WhatsAppClick', { source: 'float' })}
      aria-label="Consultar por WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl transition hover:scale-105 animate-pulse-soft sm:bottom-6 sm:right-6"
    >
      <svg width="30" height="30" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
        <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.7 5.4 2 7.8L.5 31.5l7.9-2c2.3 1.2 4.9 1.9 7.6 1.9 8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5zm0 28.3c-2.4 0-4.7-.7-6.7-1.9l-.5-.3-4.7 1.2 1.3-4.6-.3-.5a12.8 12.8 0 0 1-2-6.9C3.1 8.9 8.9 3.2 16 3.2c3.4 0 6.6 1.3 9 3.8 2.4 2.4 3.8 5.6 3.8 9 0 7.1-5.8 12.8-12.8 12.8zm7.1-9.6c-.4-.2-2.3-1.1-2.6-1.3-.4-.1-.6-.2-.9.2-.3.4-1 1.3-1.2 1.5-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3.1-1.9-1.1-1-1.9-2.3-2.1-2.7-.2-.4 0-.6.2-.8.2-.2.4-.4.6-.7.2-.2.3-.4.4-.7.1-.2 0-.5-.1-.7-.1-.2-.9-2.1-1.2-2.9-.3-.8-.6-.7-.9-.7h-.7c-.2 0-.6.1-.9.5-.3.4-1.2 1.2-1.2 2.9 0 1.7 1.2 3.3 1.4 3.6.2.2 2.5 3.8 6 5.3.8.4 1.5.6 2 .8.8.3 1.6.2 2.2.1.7-.1 2.3-.9 2.6-1.8.3-.9.3-1.6.2-1.8-.1-.2-.3-.3-.7-.5z" />
      </svg>
    </a>
  );
}
