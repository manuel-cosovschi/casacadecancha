import type { ShippingSettings, ShippingCalcSettings } from '@/lib/types';

export type ShippingRegion = 'ba' | 'centro' | 'cuyo_noa_nea' | 'patagonia';

/** Región (para el extra de Correo) según la provincia elegida. */
const REGION_BY_PROVINCE: Record<string, ShippingRegion> = {
  'Buenos Aires': 'ba',
  'Ciudad Autónoma de Buenos Aires': 'ba',
  CABA: 'ba',
  Córdoba: 'centro',
  'Santa Fe': 'centro',
  'Entre Ríos': 'centro',
  'La Pampa': 'centro',
  Mendoza: 'cuyo_noa_nea',
  'San Juan': 'cuyo_noa_nea',
  'San Luis': 'cuyo_noa_nea',
  'La Rioja': 'cuyo_noa_nea',
  Catamarca: 'cuyo_noa_nea',
  Tucumán: 'cuyo_noa_nea',
  Salta: 'cuyo_noa_nea',
  Jujuy: 'cuyo_noa_nea',
  'Santiago del Estero': 'cuyo_noa_nea',
  Chaco: 'cuyo_noa_nea',
  Formosa: 'cuyo_noa_nea',
  Corrientes: 'cuyo_noa_nea',
  Misiones: 'cuyo_noa_nea',
  Neuquén: 'patagonia',
  'Río Negro': 'patagonia',
  Chubut: 'patagonia',
  'Santa Cruz': 'patagonia',
  'Tierra del Fuego': 'patagonia',
};

export function regionForProvince(province?: string | null): ShippingRegion {
  if (!province) return 'ba';
  return REGION_BY_PROVINCE[province.trim()] ?? 'centro';
}

/** Costo del envío nacional: base de Correo + extra por región. */
export function computeNationalShipping(
  province: string | null | undefined,
  s: ShippingCalcSettings,
): number {
  const region = regionForProvince(province);
  const extra =
    region === 'ba'
      ? s.extra_ba
      : region === 'centro'
        ? s.extra_centro
        : region === 'cuyo_noa_nea'
          ? s.extra_cuyo_noa_nea
          : s.extra_patagonia;
  return Math.max(0, Math.round((s.national_base || 0) + (extra || 0)));
}

/** Distancia en km entre dos coordenadas (fórmula de Haversine). */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Costo del envío en MdP a partir de la distancia (línea recta) hasta la casa. */
export function mdpCostFromKm(straightKm: number, s: ShippingCalcSettings): number {
  // Zona cercana (Constitución / hasta Av. Libertad, ~7-8 min): envío gratis.
  if (s.mdp_free_km && straightKm <= s.mdp_free_km) return 0;
  const roadKm = straightKm * (s.road_factor || 1.3);
  const tripKm = roadKm * (s.round_trip ? 2 : 1);
  const litres = (tripKm * (s.fuel_consumption || 9)) / 100;
  const raw = litres * (s.fuel_price || 0);
  const withMin = Math.max(raw, s.mdp_min || 0);
  const round = s.mdp_round || 1;
  return Math.max(0, Math.ceil(withMin / round) * round);
}

/** Parsea la lista de zonas de respaldo ("Nombre|costo" por línea). */
export function parseZones(zones?: string): { name: string; cost: number }[] {
  if (!zones) return [];
  return zones
    .split('\n')
    .map((line) => {
      const [name, cost] = line.split('|');
      return { name: (name || '').trim(), cost: Math.max(0, Number((cost || '').trim()) || 0) };
    })
    .filter((z) => z.name);
}

export type ShippingMethod = 'mdp' | 'nacional' | 'retiro';

/** True si el método es retiro en punto de retiro (se coordina por WhatsApp). */
export function isPickup(shippingMethod: string | null | undefined): boolean {
  if (!shippingMethod) return false;
  return /retiro/i.test(shippingMethod);
}

/**
 * Recargo en ventas nacionales (trabajo de despacho por Correo).
 * Va metido en el precio: el cliente no ve un renglón aparte. En el admin se muestra diferenciado.
 */
export const NATIONAL_MARKUP_PCT = 5;

/** Precio de un producto con el recargo nacional aplicado (redondeado al peso). */
export function withNationalMarkup(base: number): number {
  return Math.round(base * (1 + NATIONAL_MARKUP_PCT / 100));
}

/** Monto del recargo nacional contenido en un subtotal ya recargado. */
export function nationalMarkupPart(markedSubtotal: number): number {
  return Math.max(0, Math.round(markedSubtotal - markedSubtotal / (1 + NATIONAL_MARKUP_PCT / 100)));
}

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
  retiro: 'Retiro en punto de retiro',
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
  if (method === 'retiro') {
    return {
      cost: 0,
      payOnDelivery: false,
      free: true,
      label: SHIPPING_LABELS.retiro,
      note: 'Coordinamos el punto de retiro y la seña por WhatsApp.',
    };
  }
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
    payOnDelivery: false,
    free: false,
    label: SHIPPING_LABELS.nacional,
    note:
      settings?.nacional_note ||
      'Enviamos por Correo Argentino. El costo del envío se calcula en el checkout y va incluido en el total.',
  };
}
