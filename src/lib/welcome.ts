import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Descuento de bienvenida: 10% en la PRIMERA compra, a cambio del mail.
 *
 * Vive en el código (igual que la promo del catálogo) para no depender de
 * cargar una fila en `promotions`. Lo que sí necesita la base es poder
 * responder "¿este email ya compró?", porque el storefront no puede leer
 * `orders` (RLS). Eso lo resuelve la RPC `orders_count_for_email`, que llega
 * con la migración 0031.
 */
export const WELCOME = {
  active: true,
  code: 'BIENVENIDA10',
  percent: 10,
  label: '10% OFF en tu primera compra',
};

/** ¿El código que escribió el cliente es el de bienvenida? */
export function isWelcomeCode(code: string): boolean {
  return (code || '').trim().toUpperCase() === WELCOME.code;
}

export interface WelcomeEligibility {
  eligible: boolean;
  /** Pedidos previos de ese email. null si no se pudo verificar. */
  orders: number | null;
  message: string;
}

/**
 * Verifica que sea realmente la primera compra de ese email.
 *
 * Falla CERRADO a propósito: si la RPC no existe todavía (migración sin
 * aplicar) o la consulta falla, devuelve no elegible. Un descuento que no se
 * puede verificar es un descuento que se lleva todo el mundo en todas las
 * compras, que es justo lo contrario de lo que se quiso hacer.
 */
export async function checkWelcomeEligibility(
  supabase: SupabaseClient,
  email: string,
): Promise<WelcomeEligibility> {
  const clean = (email || '').trim().toLowerCase();
  if (!clean || !clean.includes('@')) {
    return {
      eligible: false,
      orders: null,
      message: 'Necesitamos tu email para validar el descuento de bienvenida.',
    };
  }

  const { data, error } = await supabase.rpc('orders_count_for_email', {
    p_email: clean,
  });

  if (error || data === null || data === undefined) {
    return {
      eligible: false,
      orders: null,
      message:
        'No pudimos validar el descuento de bienvenida en este momento. Escribinos por WhatsApp y lo aplicamos a mano.',
    };
  }

  const orders = Number(data) || 0;
  if (orders > 0) {
    return {
      eligible: false,
      orders,
      message: 'El descuento de bienvenida es solo para la primera compra.',
    };
  }

  return {
    eligible: true,
    orders: 0,
    message: `Descuento de bienvenida aplicado: ${WELCOME.percent}% OFF.`,
  };
}
