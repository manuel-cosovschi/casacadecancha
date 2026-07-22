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

/**
 * Pasos del seguimiento según el tipo de envío.
 * MdP: entrega a domicilio propia. Nacional: despacho por correo (muestra el código del correo).
 */
export function deliverySteps(
  shippingMethod: string | null | undefined,
): { key: DeliveryStatus; label: string; desc: string; emoji: string }[] {
  if (isMdpDelivery(shippingMethod)) return DELIVERY_STEPS;
  return [
    { key: 'preparando', label: 'Preparando', desc: 'Estamos preparando tu pedido.', emoji: '📦' },
    { key: 'en_camino', label: 'Despachado', desc: 'Tu pedido fue despachado por correo. Seguilo con el código de abajo.', emoji: '📮' },
    { key: 'entregado', label: 'Entregado', desc: '¡Pedido entregado! Gracias por tu compra.', emoji: '✅' },
  ];
}

/** Link de seguimiento del correo, si lo conocemos. Devuelve null para mostrar solo el código. */
export function carrierTrackingUrl(carrier: string | null | undefined): string | null {
  if (!carrier) return null;
  const c = carrier.toLowerCase();
  if (c.includes('correo argentino') || c.includes('correo')) {
    return 'https://www.correoargentino.com.ar/formularios/e-commerce';
  }
  if (c.includes('andreani')) return 'https://www.andreani.com/#!/informacionEnvio';
  if (c.includes('oca')) return 'https://www1.oca.com.ar/OEPTrackingWeb/trackingEnvio.aspx';
  return null;
}
