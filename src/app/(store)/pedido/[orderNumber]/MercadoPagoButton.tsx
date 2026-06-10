'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/analytics';

/**
 * Si Checkout Pro está habilitado, crea una preference y redirige al
 * init_point. Si no, usa el link configurado como fallback.
 */
export function MercadoPagoButton({
  orderNumber,
  fallbackLink,
  checkoutProEnabled,
}: {
  orderNumber: string;
  fallbackLink: string;
  checkoutProEnabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    trackEvent('InitiateCheckout', { method: 'mercadopago', order: orderNumber });
    if (!checkoutProEnabled) {
      window.open(fallbackLink, '_blank', 'noopener');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/mercadopago/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber }),
      });
      const data = await res.json();
      if (res.ok && data.init_point) {
        window.location.href = data.init_point;
      } else {
        // Fallback al link si algo falla.
        window.open(fallbackLink, '_blank', 'noopener');
      }
    } catch {
      window.open(fallbackLink, '_blank', 'noopener');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={pay} disabled={loading} className="btn-celeste mt-4 w-full">
        {loading ? 'Generando pago…' : 'Pagar con Mercado Pago'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </>
  );
}
