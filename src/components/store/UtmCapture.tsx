'use client';

import { useEffect } from 'react';

const KEY = 'cdc_attribution';
const PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'fbclid',
];

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  referrer?: string;
  landing_page?: string;
  device?: string;
}

/** Captura UTMs/fbclid en la primera visita y las persiste. */
export function UtmCapture() {
  useEffect(() => {
    try {
      const existing = sessionStorage.getItem(KEY);
      const url = new URL(window.location.href);
      const incoming: Attribution = {};
      let hasUtm = false;
      for (const p of PARAMS) {
        const v = url.searchParams.get(p);
        if (v) {
          incoming[p as keyof Attribution] = v;
          hasUtm = true;
        }
      }
      // Sólo sobreescribimos si hay UTMs nuevas o no había nada.
      if (!existing || hasUtm) {
        const data: Attribution = {
          ...(existing ? JSON.parse(existing) : {}),
          ...incoming,
          referrer: document.referrer || (existing ? undefined : ''),
          landing_page: existing ? undefined : url.pathname,
          device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        };
        sessionStorage.setItem(KEY, JSON.stringify(data));
      }
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}

export function getAttribution(): Attribution {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
