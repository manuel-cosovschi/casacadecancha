'use server';

import { createClient } from '@/lib/supabase/server';
import { checkoutSchema, type CheckoutInput } from '@/lib/validation';
import { applyDiscount } from '@/lib/utils';
import { getAllSettings } from '@/lib/settings';
import { validateCoupon, type CouponResult } from '@/lib/coupons';
import {
  quoteShipping,
  computeNationalShipping,
  mdpCostFromKm,
  haversineKm,
} from '@/lib/shipping';
import { geocodeMdp } from '@/lib/geocode';
import type { ShippingCalcSettings } from '@/lib/types';
import { sendOrderPush } from '@/lib/push';
import { sendEmail } from '@/lib/email';

interface ActionResult {
  ok: boolean;
  orderNumber?: string;
  error?: string;
}

export interface ShippingEstimate {
  cost: number;
  geocoded: boolean; // true si se pudo ubicar la dirección
  km?: number;
  needsZone: boolean; // true si hay que caer a elegir zona manual
}

/** Calcula el costo de envío del lado del servidor (fuente de verdad). */
async function resolveShippingCost(
  data: CheckoutInput,
  calc: ShippingCalcSettings,
): Promise<number> {
  if (data.shipping_method === 'retiro') return 0;
  if (data.shipping_method === 'nacional') {
    return computeNationalShipping(data.province, calc);
  }
  // Mar del Plata
  if (!calc.mdp_charge) return 0;
  const fullAddress = [data.address, data.address_number].filter(Boolean).join(' ');
  if (fullAddress.trim().length >= 3) {
    const coords = await geocodeMdp(fullAddress);
    if (coords) {
      const km = haversineKm({ lat: calc.origin_lat, lng: calc.origin_lng }, coords);
      return mdpCostFromKm(km, calc);
    }
  }
  // Sin geolocalización: usar la zona elegida (validada contra settings) o el fallback.
  if (data.mdp_zone) {
    const zone = (calc.zones || '')
      .split('\n')
      .map((l) => l.split('|'))
      .find((p) => (p[0] || '').trim() === data.mdp_zone);
    if (zone) return Math.max(0, Number((zone[1] || '').trim()) || 0);
  }
  return calc.mdp_fallback || 0;
}

/** Estima el envío en MdP a partir de una dirección (para mostrarlo antes de confirmar). */
export async function estimateMdpShipping(address: string): Promise<ShippingEstimate> {
  const settings = await getAllSettings();
  const calc = settings.shipping_calc as ShippingCalcSettings;
  if (!calc?.mdp_charge) return { cost: 0, geocoded: true, needsZone: false };
  const coords = address.trim().length >= 3 ? await geocodeMdp(address) : null;
  if (!coords) {
    return { cost: calc.mdp_fallback || 0, geocoded: false, needsZone: true };
  }
  const km = haversineKm({ lat: calc.origin_lat, lng: calc.origin_lng }, coords);
  return { cost: mdpCostFromKm(km, calc), geocoded: true, km: Math.round(km * 10) / 10, needsZone: false };
}

/** Guarda el carrito (para recordatorio si no se completa la compra). */
export async function saveCart(input: {
  email: string;
  phone?: string | null;
  items: { name: string; quantity: number; size?: string; price?: number }[];
  subtotal: number;
}): Promise<void> {
  if (!input.email || !input.email.includes('@')) return;
  try {
    const supabase = await createClient();
    await supabase.rpc('save_abandoned_cart', {
      p_email: input.email.toLowerCase().trim(),
      p_phone: input.phone || null,
      p_items: input.items,
      p_subtotal: input.subtotal,
    });
  } catch {
    /* no-op */
  }
}

/** Valida un cupón desde el storefront (lectura pública de promociones). */
export async function applyCoupon(
  code: string,
  subtotal: number,
): Promise<CouponResult> {
  try {
    const supabase = await createClient();
    return await validateCoupon(supabase, code, subtotal);
  } catch {
    return { valid: false, code, discount: 0, message: 'No se pudo validar el cupón.' };
  }
}

/**
 * Crea un pedido: valida stock, recalcula precios desde la base,
 * reserva stock y registra el pedido con estado pending_payment.
 */
export async function createOrder(input: CheckoutInput): Promise<ActionResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' };
  }
  const data = parsed.data;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: 'El sistema de pedidos no está configurado.' };
  }

  const settings = await getAllSettings();
  const transferActive = Boolean(settings.payments_transfer?.active);
  const transferPct = transferActive ? settings.payments_transfer.discount_percent || 0 : 0;

  // 1. Traer variantes y productos reales
  const variantIds = data.items.map((i) => i.variantId);
  const { data: variants, error: vErr } = await supabase
    .from('product_variants')
    .select('id, product_id, size, stock_physical, stock_reserved, encargo_reserved, variant_cost, variant_price, active, products(name, price, unit_cost, packaging_cost, allow_backorder, transfer_discount)')
    .in('id', variantIds);

  if (vErr || !variants) {
    return { ok: false, error: 'No se pudo validar el carrito.' };
  }

  // 2. Construir items validados
  let subtotal = 0;
  let eligibleSubtotal = 0; // base para el descuento por transferencia
  let estimatedCost = 0;
  const orderItems: {
    product_id: string;
    variant_id: string;
    product_name: string;
    size: string | null;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    subtotal: number;
  }[] = [];
  const reservations: { variantId: string; quantity: number; current: number }[] = [];

  for (const item of data.items) {
    const v = variants.find((x) => x.id === item.variantId);
    if (!v || !v.active) {
      return { ok: false, error: 'Un producto del carrito ya no está disponible.' };
    }
    const product = Array.isArray(v.products) ? v.products[0] : (v.products as any);
    const available = (v.stock_physical || 0) - (v.stock_reserved || 0) - (v.encargo_reserved || 0);
    const allowBackorder = Boolean(product?.allow_backorder);

    if (available < item.quantity && !allowBackorder) {
      return {
        ok: false,
        error: `Sin stock suficiente de ${product?.name || 'un producto'} (talle ${v.size}).`,
      };
    }

    const price = v.variant_price ?? product?.price ?? 0;
    const cost = (v.variant_cost ?? product?.unit_cost ?? 0) + (product?.packaging_cost ?? 0);
    const lineSubtotal = price * item.quantity;
    subtotal += lineSubtotal;
    if (product?.transfer_discount !== false) eligibleSubtotal += lineSubtotal;
    estimatedCost += cost * item.quantity;

    orderItems.push({
      product_id: v.product_id,
      variant_id: v.id,
      product_name: product?.name ?? 'Producto',
      size: v.size,
      quantity: item.quantity,
      unit_price: price,
      unit_cost: cost,
      subtotal: lineSubtotal,
    });

    reservations.push({
      variantId: v.id,
      quantity: item.quantity,
      current: v.stock_reserved || 0,
    });
  }

  // 3. Cupón (revalidado en el servidor)
  let couponResult: CouponResult | null = null;
  if (data.coupon_code) {
    couponResult = await validateCoupon(supabase, data.coupon_code, subtotal);
    if (!couponResult.valid) {
      return { ok: false, error: couponResult.message };
    }
  }
  const couponDiscount = couponResult?.valid ? couponResult.discount : 0;

  // 4. Calcular totales
  const transferDiscount =
    data.payment_method === 'transfer' && transferPct > 0
      ? eligibleSubtotal - applyDiscount(eligibleSubtotal, transferPct)
      : 0;
  const discount = transferDiscount + couponDiscount;

  const shippingQuote = quoteShipping(data.shipping_method, settings.shipping);
  const calc = settings.shipping_calc as ShippingCalcSettings;
  const shippingCost = await resolveShippingCost(data, calc);
  const total = Math.max(0, subtotal - discount + shippingCost);

  // 5. Crear pedido vía RPC SECURITY DEFINER (intake seguro sin service role)
  const shippingLabel =
    shippingCost > 0
      ? `${shippingQuote.label} ($${shippingCost.toLocaleString('es-AR')})`
      : `${shippingQuote.label} (sin cargo)`;
  const shippingNote = shippingQuote.note;
  const combinedNotes = [data.notes, shippingNote].filter(Boolean).join(' · ');

  // En MdP y retiro la provincia/ciudad se autocompletan (son locales).
  const isLocal = data.shipping_method !== 'nacional';
  const effProvince = isLocal ? 'Buenos Aires' : data.province;
  const effCity = isLocal ? 'Mar del Plata' : data.city;

  const payload = {
    coupon_code: couponResult?.valid ? couponResult.code : null,
    customer: {
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      email: data.email,
      dni: data.dni || null,
      province: effProvince,
      city: effCity,
      postal_code: data.postal_code || null,
      address: [data.address, data.address_number, data.floor].filter(Boolean).join(' ') || null,
      utm_source: data.attribution?.utm_source || null,
      utm_medium: data.attribution?.utm_medium || null,
      utm_campaign: data.attribution?.utm_campaign || null,
    },
    order: {
      subtotal,
      discount,
      coupon_code: couponResult?.valid ? couponResult.code : null,
      coupon_discount: couponDiscount,
      shipping_cost: shippingCost,
      total,
      estimated_cost: estimatedCost,
      payment_method: data.payment_method,
      shipping_method: shippingLabel,
      customer_name: `${data.first_name} ${data.last_name}`,
      customer_phone: data.phone,
      customer_email: data.email,
      province: effProvince,
      city: effCity,
      address:
        [data.address, data.address_number, data.floor, data.references]
          .filter(Boolean)
          .join(' ') || null,
      postal_code: data.postal_code || null,
      notes: combinedNotes || null,
      utm_source: data.attribution?.utm_source || null,
      utm_medium: data.attribution?.utm_medium || null,
      utm_campaign: data.attribution?.utm_campaign || null,
      utm_content: data.attribution?.utm_content || null,
      utm_term: data.attribution?.utm_term || null,
      fbclid: data.attribution?.fbclid || null,
      referrer: data.attribution?.referrer || null,
      landing_page: data.attribution?.landing_page || null,
      device: data.attribution?.device || null,
    },
    items: orderItems,
    reservations: reservations.map((r) => ({
      variant_id: r.variantId,
      quantity: r.quantity,
    })),
  };

  const { data: orderNumber, error: rpcErr } = await supabase.rpc(
    'storefront_create_order',
    { p: payload },
  );

  if (rpcErr || !orderNumber) {
    return { ok: false, error: 'No se pudo registrar el pedido. Intentá de nuevo.' };
  }

  // Marcar el carrito como convertido (no enviar recordatorio).
  try {
    await supabase.rpc('mark_cart_converted', { p_email: data.email.toLowerCase().trim() });
  } catch {
    /* no-op */
  }

  // Avisos al administrador (push + email). Best-effort.
  const num = orderNumber as string;
  await sendOrderPush(num, total, 'web');
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `🛒 Nuevo pedido #${num}`,
      html: `<div style="font-family:system-ui,sans-serif;color:#0B1F3A">
        <h2>Nuevo pedido #${num}</h2>
        <p>Total: <strong>$${total.toLocaleString('es-AR')}</strong></p>
        <p>Cliente: ${data.first_name} ${data.last_name} — ${data.phone}</p>
        <p>Medio de pago: ${data.payment_method === 'transfer' ? 'Transferencia' : 'Mercado Pago'}</p>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/admin/pedidos/${num}"
              style="background:#0B1F3A;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
           Ver pedido</a></p>
      </div>`,
    });
  }

  return { ok: true, orderNumber: num };
}
