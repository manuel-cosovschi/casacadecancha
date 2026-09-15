import type { SupabaseClient } from '@supabase/supabase-js';
import { motivoSinBaseDescontable } from '@/lib/promo-linea';

export interface CouponResult {
  valid: boolean;
  code: string;
  discount: number;
  message: string;
}

/**
 * Valida un cupón contra la tabla `promotions` y calcula el descuento
 * sobre el subtotal. Reutilizable desde el storefront y desde createOrder.
 */
export async function validateCoupon(
  supabase: SupabaseClient,
  rawCode: string,
  subtotal: number,
): Promise<CouponResult> {
  const code = (rawCode || '').trim();
  if (!code) return { valid: false, code: '', discount: 0, message: 'Ingresá un código.' };

  // Por RPC y no leyendo la tabla: la lectura pública de `promotions` dejaba
  // listar todos los códigos vivos desde el navegador con la clave pública.
  // Esta función resuelve UN código exacto, que es lo único que hace falta
  // para validar y lo único que ya sabe quien tiene el cupón.
  const { data: promo } = await supabase.rpc('coupon_lookup', { p_code: code });

  if (!promo) {
    return { valid: false, code, discount: 0, message: 'Cupón inválido o inactivo.' };
  }

  const now = new Date();
  if (promo.start_date && new Date(promo.start_date) > now) {
    return { valid: false, code, discount: 0, message: 'El cupón todavía no está vigente.' };
  }
  if (promo.end_date && new Date(promo.end_date) < now) {
    return { valid: false, code, discount: 0, message: 'El cupón está vencido.' };
  }
  if (promo.minimum_amount && subtotal < Number(promo.minimum_amount)) {
    return {
      valid: false,
      code,
      discount: 0,
      message: `El cupón aplica a partir de $${Number(promo.minimum_amount).toLocaleString('es-AR')}.`,
    };
  }
  if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
    return { valid: false, code, discount: 0, message: 'El cupón alcanzó su límite de usos.' };
  }

  // El de envío gratis no toca el subtotal, así que vale aunque la base sea
  // cero. Los que descuentan plata, no: sin base no descuentan nada.
  if (promo.type !== 'free_shipping' && !(subtotal > 0)) {
    return { valid: false, code, discount: 0, message: motivoSinBaseDescontable() };
  }

  let discount = 0;
  if (promo.percentage) {
    discount = Math.round(subtotal * (Number(promo.percentage) / 100));
  } else if (promo.fixed_amount) {
    discount = Math.min(Number(promo.fixed_amount), subtotal);
  } else if (promo.type === 'free_shipping') {
    // El envío gratis se resuelve en el cálculo de envío; acá no descuenta del subtotal.
    discount = 0;
  }

  return {
    valid: true,
    code: promo.code || code,
    discount,
    message:
      promo.type === 'free_shipping'
        ? 'Cupón de envío gratis aplicado.'
        : `Cupón aplicado: ahorrás $${discount.toLocaleString('es-AR')}.`,
  };
}

export function isFreeShippingCoupon(type?: string) {
  return type === 'free_shipping';
}
