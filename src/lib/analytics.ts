// Helpers de tracking (Meta Pixel / GA / TikTok). Seguros si no hay pixel.

type EventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'Contact'
  | 'WhatsAppClick';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    ttq?: { track: (name: string, data?: unknown) => void };
  }
}

const STANDARD = new Set([
  'PageView',
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
  'Purchase',
  'Contact',
]);

export function trackEvent(name: EventName, data?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    if (window.fbq) {
      if (STANDARD.has(name)) {
        window.fbq('track', name, data);
      } else {
        window.fbq('trackCustom', name, data);
      }
    }
    if (window.gtag) {
      window.gtag('event', name, data);
    }
    if (window.ttq) {
      window.ttq.track(name, data);
    }
  } catch {
    /* no-op */
  }
}
