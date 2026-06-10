'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkoutSchema, type CheckoutInput } from '@/lib/validation';
import { applyDiscount } from '@/lib/utils';
import { getAllSettings } from '@/lib/settings';
import { validateCoupon, isFreeShippingCoupon, type CouponResult } from '@/lib/coupons';
import { quoteShipping, SHIPPING_LABELS } from '@/lib/shipping';

interface ActionResult {
  ok: boolean;
  orderNumber?: string;
  error?: string;
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
    supabase = createAdminClient();
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
    .select('id, product_id, size, stock_physical, stock_reserved, variant_cost, variant_price, active, products(name, price, unit_cost, packaging_cost, allow_backorder)')
    .in('id', variantIds);

  if (vErr || !variants) {
    return { ok: false, error: 'No se pudo validar el carrito.' };
  }

  // 2. Construir items validados
  let subtotal = 0;
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
    const available = (v.stock_physical || 0) - (v.stock_reserved || 0);
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
  let couponFreeShipping = false;
  if (data.coupon_code) {
    couponResult = await validateCoupon(supabase, data.coupon_code, subtotal);
    if (!couponResult.valid) {
      return { ok: false, error: couponResult.message };
    }
    // ¿Es un cupón de envío gratis?
    const { data: promo } = await supabase
      .from('promotions')
      .select('type')
      .ilike('code', data.coupon_code)
      .eq('active', true)
      .maybeSingle();
    couponFreeShipping = isFreeShippingCoupon(promo?.type);
  }
  const couponDiscount = couponResult?.valid ? couponResult.discount : 0;

  // 4. Calcular totales
  const transferDiscount =
    data.payment_method === 'transfer' && transferPct > 0
      ? subtotal - applyDiscount(subtotal, transferPct)
      : 0;
  const discount = transferDiscount + couponDiscount;

  const shippingQuote = quoteShipping(
    data.shipping_method,
    settings.shipping,
    subtotal - couponDiscount,
    couponFreeShipping,
  );
  const shippingCost = shippingQuote.cost;
  const total = Math.max(0, subtotal - discount + shippingCost);

  // 4. Crear cliente
  const { data: customer } = await supabase
    .from('customers')
    .insert({
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      email: data.email,
      dni: data.dni || null,
      province: data.province,
      city: data.city,
      postal_code: data.postal_code || null,
      address: [data.address, data.address_number, data.floor].filter(Boolean).join(' ') || null,
      source: 'web',
      utm_source: data.attribution?.utm_source || null,
      utm_medium: data.attribution?.utm_medium || null,
      utm_campaign: data.attribution?.utm_campaign || null,
    })
    .select('id')
    .single();

  // 5. Crear pedido
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .insert({
      customer_id: customer?.id ?? null,
      subtotal,
      discount,
      coupon_code: couponResult?.valid ? couponResult.code : null,
      coupon_discount: couponDiscount,
      shipping_cost: shippingCost,
      total,
      estimated_cost: estimatedCost,
      payment_method: data.payment_method,
      payment_status: 'pending_payment',
      order_status: 'new',
      shipping_method: shippingQuote.toCoordinate
        ? `${SHIPPING_LABELS[data.shipping_method]} (a coordinar)`
        : SHIPPING_LABELS[data.shipping_method],
      channel: 'web',
      customer_name: `${data.first_name} ${data.last_name}`,
      customer_phone: data.phone,
      customer_email: data.email,
      province: data.province,
      city: data.city,
      address: [data.address, data.address_number, data.floor, data.references]
        .filter(Boolean)
        .join(' ') || null,
      postal_code: data.postal_code || null,
      notes: data.notes || null,
      utm_source: data.attribution?.utm_source || null,
      utm_medium: data.attribution?.utm_medium || null,
      utm_campaign: data.attribution?.utm_campaign || null,
      utm_content: data.attribution?.utm_content || null,
      utm_term: data.attribution?.utm_term || null,
      fbclid: data.attribution?.fbclid || null,
      referrer: data.attribution?.referrer || null,
      landing_page: data.attribution?.landing_page || null,
      device: data.attribution?.device || null,
    })
    .select('id, order_number')
    .single();

  if (oErr || !order) {
    return { ok: false, error: 'No se pudo registrar el pedido. Intentá de nuevo.' };
  }

  // 6. Items
  await supabase.from('order_items').insert(
    orderItems.map((i) => ({ ...i, order_id: order.id })),
  );

  // 7. Pago inicial
  await supabase.from('payments').insert({
    order_id: order.id,
    method: data.payment_method,
    amount: total,
    status: 'pending_payment',
  });

  // 8. Reservar stock + movimientos
  for (const r of reservations) {
    await supabase
      .from('product_variants')
      .update({ stock_reserved: r.current + r.quantity })
      .eq('id', r.variantId);
    await supabase.from('inventory_movements').insert({
      variant_id: r.variantId,
      type: 'reserva',
      quantity: r.quantity,
      reason: `Reserva por pedido ${order.order_number}`,
      related_order_id: order.id,
    });
  }

  // 9. Registrar uso del cupón
  if (couponResult?.valid) {
    await supabase.rpc('increment_promotion_use', { p_code: couponResult.code });
  }

  return { ok: true, orderNumber: order.order_number };
}
