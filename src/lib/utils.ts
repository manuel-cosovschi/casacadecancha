import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Product } from '@/lib/types';

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

/** Preventa: seña que se paga por adelantado (el resto se paga al recibir). */
export const PREORDER_DEPOSIT_PCT = 50;

/** Monto de la seña de preventa sobre un precio. */
export function preorderDeposit(price: number): number {
  return Math.round((price * PREORDER_DEPOSIT_PCT) / 100);
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

/**
 * ¿Le queda algún talle para comprar?
 *
 * Mira solo las variantes activas: un talle apagado en el panel no cuenta,
 * aunque la base todavía diga que tiene unidades. Un producto sin ninguna
 * variante activa está agotado por definición.
 */
export function estaAgotado(p: Pick<Product, 'variants'>): boolean {
  const variantes = (p.variants ?? []).filter((v) => v.active);
  if (variantes.length === 0) return true;
  return variantes.every((v) => availableStock(v) <= 0);
}

/**
 * ¿Este producto va en las grillas de la tienda?
 *
 * Lo agotado no se muestra más. Una vidriera con la mitad de los carteles en
 * "Agotada" espanta al que entra y hace que lo que sí hay se pierda entre lo que
 * no: el que llega buscando una camiseta ve que no hay nada y se va.
 *
 * Ojo con lo que NO hace: la ficha del producto (`getProductBySlug`) no usa este
 * filtro. El link directo, el que manda Goat, el de Instagram y el del mail
 * siguen abriendo, con el cartel de agotado y la lista de espera para avisar
 * cuando vuelva. Lo que desaparece es la vidriera, no el producto.
 *
 * Tres cosas se venden justamente sin stock a mano y quedan siempre a la vista:
 * - `preorder`: preventa, se paga la seña ahora y llega después.
 * - `allow_backorder`: se puede encargar aunque no haya en el depósito.
 * - `mystery_box`: se arman a mano con lo que haya, no tienen stock propio.
 */
export function vaEnLaVidriera(p: Pick<Product, 'variants' | 'preorder' | 'allow_backorder' | 'mystery_box'>): boolean {
  if (p.preorder || p.allow_backorder || p.mystery_box) return true;
  return !estaAgotado(p);
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
