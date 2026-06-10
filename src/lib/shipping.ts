import type { ShippingSettings } from '@/lib/types';

export type ShippingMethod = 'mdp' | 'nacional';

export interface ShippingQuote {
  cost: number;
  /** El costo del envío se abona al recibir el producto. */
  payOnDelivery: boolean;
  /** Entrega sin cargo. */
  free: boolean;
  label: string;
  note: string;
}

export const SHIPPING_LABELS: Record<ShippingMethod, string> = {
  mdp: 'Entrega en Mar del Plata',
  nacional: 'Envío al resto del país',
};

/**
 * Modelo de envío de Casaca de Cancha:
 *  - Mar del Plata: entrega gratis, coordinada por WhatsApp.
 *  - Resto del país: el costo del envío se abona al recibir el producto.
 */
export function quoteShipping(
  method: ShippingMethod,
  settings: ShippingSettings,
): ShippingQuote {
  if (method === 'mdp') {
    return {
      cost: 0,
      payOnDelivery: false,
      free: true,
      label: SHIPPING_LABELS.mdp,
      note:
        settings?.mdp_text ||
        'Coordinamos la entrega en Mar del Plata por WhatsApp, sin cargo.',
    };
  }
  // nacional
  return {
    cost: 0,
    payOnDelivery: true,
    free: false,
    label: SHIPPING_LABELS.nacional,
    note:
      settings?.nacional_note ||
      'El costo del envío se abona al recibir el producto.',
  };
}
