import type { ShippingSettings } from '@/lib/types';

export type ShippingMethod = 'nacional' | 'retiro' | 'coordinar';

export interface ShippingQuote {
  cost: number;
  /** true cuando el costo se define luego (a coordinar). */
  toCoordinate: boolean;
  label: string;
}

export const SHIPPING_LABELS: Record<ShippingMethod, string> = {
  nacional: 'Envío nacional',
  retiro: 'Retiro en Mar del Plata',
  coordinar: 'Envío a coordinar',
};

/**
 * Calcula el costo de envío según la modalidad y la configuración.
 * @param freeShipping fuerza envío gratis (cupón de free_shipping).
 */
export function quoteShipping(
  method: ShippingMethod,
  settings: ShippingSettings,
  subtotal: number,
  freeShipping = false,
): ShippingQuote {
  if (method === 'retiro') {
    return { cost: 0, toCoordinate: false, label: 'Retiro en Mar del Plata' };
  }
  if (method === 'coordinar') {
    return { cost: 0, toCoordinate: true, label: 'Envío a coordinar' };
  }
  // nacional
  const flat = Number(settings?.flat_rate || 0);
  const freeFrom = Number(settings?.free_from || 0);
  if (freeShipping || flat === 0 || (freeFrom > 0 && subtotal >= freeFrom)) {
    return { cost: 0, toCoordinate: flat === 0 && !freeShipping, label: 'Envío nacional' };
  }
  return { cost: flat, toCoordinate: false, label: 'Envío nacional' };
}
