import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ARS = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

/** Formatea un número como pesos argentinos. */
export function formatPrice(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '$0';
  return ARS.format(Math.round(value));
}

/** Recargo por pagar con Mercado Pago (impuestos). Se muestra como renglón aparte. */
export const MP_SURCHARGE_PCT = 7;

/** Monto del recargo de Mercado Pago sobre una base (total antes del recargo). */
export function mpSurcharge(base: number): number {
  return Math.max(0, Math.round((base * MP_SURCHARGE_PCT) / 100));
}

/** Aplica un porcentaje de descuento a un monto. */
export function applyDiscount(amount: number, percent: number): number {
  const pct = Math.max(0, Math.min(100, percent || 0));
  return Math.round(amount * (1 - pct / 100));
}

/** Monto ahorrado al aplicar el descuento. */
export function discountAmount(amount: number, percent: number): number {
  return amount - applyDiscount(amount, percent);
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/** Stock disponible = físico - reservado web - reservado por encargos. */
export function availableStock(v: {
  stock_physical: number;
  stock_reserved: number;
  encargo_reserved?: number;
}): number {
  return Math.max(
    0,
    (v.stock_physical || 0) - (v.stock_reserved || 0) - (v.encargo_reserved || 0),
  );
}

/** Construye un link de WhatsApp con mensaje pre-cargado. */
export function whatsappLink(number: string, message: string): string {
  const clean = (number || '').replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function classForBadge(badge: string): string {
  const map: Record<string, string> = {
    Nuevo: 'bg-celeste text-navy',
    Oferta: 'bg-red-500 text-white',
    'Más vendido': 'bg-gold text-navy',
    'Últimos talles': 'bg-amber-500 text-white',
    Niños: 'bg-celeste text-navy',
  };
  return map[badge] ?? 'bg-navy text-white';
}
