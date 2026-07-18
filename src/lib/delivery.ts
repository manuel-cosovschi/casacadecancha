/** Estados del seguimiento de envío en Mar del Plata. */
export type DeliveryStatus = 'preparando' | 'en_camino' | 'entregado';

export const DELIVERY_STEPS: { key: DeliveryStatus; label: string; desc: string; emoji: string }[] = [
  { key: 'preparando', label: 'Preparando', desc: 'Estamos preparando tu pedido.', emoji: '📦' },
  { key: 'en_camino', label: 'En camino', desc: 'Tu pedido salió y va camino a tu domicilio.', emoji: '🛵' },
  { key: 'entregado', label: 'Entregado', desc: '¡Pedido entregado! Gracias por tu compra.', emoji: '✅' },
];

export function normalizeDeliveryStatus(s: string | null | undefined): DeliveryStatus {
  if (s === 'en_camino' || s === 'entregado') return s;
  return 'preparando';
}

export function deliveryStepIndex(s: string | null | undefined): number {
  return DELIVERY_STEPS.findIndex((d) => d.key === normalizeDeliveryStatus(s));
}

/** True si el pedido es una entrega en Mar del Plata (según la etiqueta de envío). */
export function isMdpDelivery(shippingMethod: string | null | undefined): boolean {
  if (!shippingMethod) return false;
  return /mar del plata/i.test(shippingMethod);
}
