'use server';

import { createClient } from '@/lib/supabase/server';
import { checkoutSchema, type CheckoutInput } from '@/lib/validation';
import { applyDiscount, mpSurcharge, preorderDeposit } from '@/lib/utils';
import { salePercentAt, couponBlockedBySale } from '@/lib/sale';
import { motivoSinBaseDescontable, precioPromoLinea, promoLineaVigente } from '@/lib/promo-linea';
import { isWelcomeCode, checkWelcomeEligibility, WELCOME } from '@/lib/welcome';
import { isLoyaltyCode, checkLoyalty, loyaltyForEmail, LOYALTY } from '@/lib/loyalty';
import { socioParaEmail, numeroDeSocio, SOCIO } from '@/lib/socios';
import { getAllSettings, vacationState } from '@/lib/settings';
import { validateCoupon, type CouponResult } from '@/lib/coupons';
import {
  quoteShipping,
  computeNationalShipping,
  mdpCostFromDrivingKm,
  estimateDrivingKm,
  haversineKm,
  withNationalMarkup,
} from '@/lib/shipping';
import { geocodeMdp } from '@/lib/geocode';
import { drivingKm } from '@/lib/ruteo';
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

/**
 * Kilómetros de manejo hasta una casa de Mar del Plata.
 *
 * Medidos contra el callejero real. Si el ruteador no contesta caemos a la
 * estimación geométrica de siempre: es peor, pero frenar la compra porque un
 * servicio de mapas está caído sería mucho peor.
 */
async function kmEnAutoHasta(
  coords: { lat: number; lng: number },
  calc: ShippingCalcSettings,
): Promise<number> {
  const origin = { lat: calc.origin_lat, lng: calc.origin_lng };
  const medidos = await drivingKm(origin, coords);
  if (medidos !== null) return medidos;
  return estimateDrivingKm(haversineKm(origin, coords), calc);
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
      return mdpCostFromDrivingKm(await kmEnAutoHasta(coords, calc), calc);
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
  const km = await kmEnAutoHasta(coords, calc);
  return {
    cost: mdpCostFromDrivingKm(km, calc),
    geocoded: true,
    km: Math.round(km * 10) / 10,
    needsZone: false,
  };
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



export interface LoyaltyLookup {
  /** Descuento que le corresponde por ser cliente. 0 = no le corresponde. */
  percent: number;
  /** Compras que ya tiene contadas. */
  orders: number;
  /** Cuántas le faltan para el próximo escalón (null si está al tope). */
  toNext: number | null;
  nextPercent: number | null;
  /** Texto listo para mostrar, o null si no hay nada que decir. */
  message: string | null;
  /** True si además tiene el carnet de socio al día. */
  socio: boolean;
  socioNumero: number | null;
  socioFundador: boolean;
}

const NO_LOYALTY: LoyaltyLookup = {
  percent: 0,
  orders: 0,
  toNext: null,
  nextPercent: null,
  message: null,
  socio: false,
  socioNumero: null,
  socioFundador: false,
};

/**
 * Nivel de fidelidad de ese email, para mostrarlo y aplicarlo en el checkout
 * sin que el cliente tenga que hacer nada.
 *
 * Esto es solo para la vista: el descuento que se cobra lo vuelve a calcular
 * `createOrder` desde cero contra la base. Lo que devuelva esta función no
 * define ningún precio.
 */
export async function lookupLoyalty(email: string): Promise<LoyaltyLookup> {
  if (!LOYALTY.active) return NO_LOYALTY;

  try {
    const supabase = await createClient();
    // El carnet se consulta aunque haya promo del catálogo: el envío sin cargo
    // no depende del precio de las camisetas, y el socio paga por eso todos los
    // meses. Lo único que la promo bloquea es el descuento.
    const carnet = await socioParaEmail(supabase, email);
    const socio = carnet.activo
      ? { socio: true, socioNumero: carnet.numero, socioFundador: carnet.fundador }
      : { socio: false, socioNumero: null, socioFundador: false };

    // Con la promo del catálogo activa no se acumula nada, así que ni se
    // ofrece: mostrarlo y no poder aplicarlo sería peor que no mostrarlo.
    if (couponBlockedBySale()) return { ...NO_LOYALTY, ...socio };

    const st = await loyaltyForEmail(supabase, email);
    const porCompras = st.ok ? st.percent : 0;
    // No se suman: se aplica el mejor. En la práctica el socio llega al 15%
    // desde la primera compra, que sin carnet recién se consigue en la cuarta.
    const percent = Math.max(porCompras, carnet.activo ? SOCIO.percent : 0);
    if (percent <= 0) return { ...NO_LOYALTY, ...socio };

    return {
      percent,
      orders: st.ok ? st.orders : 0,
      // Con el carnet ya está en el tope: mostrarle cuántas compras le faltan
      // para un escalón que ya tiene sería decirle que le falta algo.
      toNext: carnet.activo ? null : st.toNext,
      nextPercent: carnet.activo ? null : st.nextPercent,
      message: carnet.activo
        ? `${SOCIO.nombre} ${numeroDeSocio(carnet.numero)}: ${percent}% OFF y envío sin cargo en Mar del Plata.`
        : `Sos cliente de Casaca: ${percent}% OFF aplicado por tus ${st.orders} ${
            st.orders === 1 ? 'compra' : 'compras'
          } anteriores.`,
      ...socio,
    };
  } catch {
    return NO_LOYALTY;
  }
}

/**
 * Valida el cupón de fidelidad. El nivel sale del historial de compras, así que
 * si la base no puede responderlo se rechaza (ver `checkLoyalty`).
 */
async function validateLoyaltyCoupon(
  supabase: Awaited<ReturnType<typeof createClient>>,
  code: string,
  subtotal: number,
  email?: string,
): Promise<CouponResult> {
  const clean = code.trim().toUpperCase();
  if (!(subtotal > 0)) {
    return { valid: false, code: clean, discount: 0, message: motivoSinBaseDescontable() };
  }
  const check = await checkLoyalty(supabase, email || '', clean);
  if (!check.valid) {
    return { valid: false, code: clean, discount: 0, message: check.message };
  }
  const discount = Math.round(subtotal * (check.percent / 100));
  return {
    valid: true,
    code: clean,
    discount,
    message: `Cupón de cliente aplicado: ahorrás $${discount.toLocaleString('es-AR')}.`,
  };
}

/**
 * Valida el cupón de bienvenida. No sale de la tabla `promotions`: el código es
 * personal y está firmado con el mail del cliente, y además se contrasta contra
 * el historial de pedidos cuando la base puede responderlo.
 * Ver `checkWelcomeEligibility` para el orden de prioridad.
 */
async function validateWelcomeCoupon(
  supabase: Awaited<ReturnType<typeof createClient>>,
  code: string,
  subtotal: number,
  email?: string,
  phone?: string | null,
  dni?: string | null,
): Promise<CouponResult> {
  if (!WELCOME.active) {
    return { valid: false, code, discount: 0, message: 'Cupón inválido o inactivo.' };
  }
  const clean = code.trim().toUpperCase();
  // Este corre sobre el carrito entero, promos incluidas, así que acá un
  // subtotal en cero solo puede ser un carrito vacío.
  if (!(subtotal > 0)) {
    return { valid: false, code: clean, discount: 0, message: 'Tu carrito está vacío.' };
  }
  const check = await checkWelcomeEligibility(supabase, email || '', clean, phone, dni);
  if (!check.eligible) {
    return { valid: false, code: clean, discount: 0, message: check.message };
  }
  // El porcentaje sale del código y no de la configuración: los que se
  // emitieron al 10% se respetan hasta que se vencen.
  const discount = Math.round(subtotal * (check.percent / 100));
  return {
    valid: true,
    code: clean,
    discount,
    message: `Descuento de bienvenida (${check.percent}%) aplicado: ahorrás $${discount.toLocaleString('es-AR')}.`,
  };
}

/** Valida un cupón desde el storefront (lectura pública de promociones). */
export async function applyCoupon(
  code: string,
  subtotal: number,
  email?: string,
  /** Solo los usa el de bienvenida, para no dar el mismo descuento dos veces. */
  phone?: string | null,
  dni?: string | null,
): Promise<CouponResult> {
  // Los cupones no se acumulan con la promo del catálogo. El de bienvenida sí:
  // es la excepción, y por eso es más chico.
  const blocked = isWelcomeCode(code) ? null : couponBlockedBySale();
  if (blocked) return { valid: false, code, discount: 0, message: blocked };
  try {
    const supabase = await createClient();
    // El de bienvenida no vive en `promotions`: se valida contra el historial
    // de compras de ese email.
    if (isWelcomeCode(code)) {
      return await validateWelcomeCoupon(supabase, code, subtotal, email, phone, dni);
    }
    if (isLoyaltyCode(code)) {
      return await validateLoyaltyCoupon(supabase, code, subtotal, email);
    }
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
  // Vacaciones: los pedidos por la web están pausados.
  const vac = vacationState(settings);
  if (vac.active) {
    return {
      ok: false,
      error: `Estamos de vacaciones y los pedidos están pausados. ${vac.subtitle || ''}`.trim(),
    };
  }
  const transferActive = Boolean(settings.payments_transfer?.active);
  const transferPct = transferActive ? settings.payments_transfer.discount_percent || 0 : 0;

  // 1. Traer variantes y productos reales
  const variantIds = data.items.map((i) => i.variantId);
  const { data: variants, error: vErr } = await supabase
    .from('product_variants')
    .select('id, product_id, size, stock_physical, stock_reserved, encargo_reserved, variant_price, active, products(name, slug, price, allow_backorder, transfer_discount, preorder)')
    .in('id', variantIds);

  if (vErr || !variants) {
    return { ok: false, error: 'No se pudo validar el carrito.' };
  }

  // 2. Construir items validados
  // Promo del catálogo: se resuelve una sola vez por pedido para que todas las
  // líneas usen el mismo porcentaje aunque la promo venza mientras se cobra.
  const salePct = salePercentAt();
  let saleDiscount = 0; // solo informativo: ya viene descontado en unit_price
  let promoLineaDiscount = 0; // solo informativo: ya viene descontado en unit_price
  let subtotal = 0;
  let eligibleSubtotal = 0; // base para el descuento por transferencia
  // Base sobre la que corren cupón y descuento de cliente: el subtotal SIN los
  // productos que ya están en promo de línea. Es la regla de no acumulación:
  // esa camiseta ya tiene su descuento y no recibe otro encima. Sin promo
  // activa esto vale exactamente lo mismo que `subtotal`.
  let discountableSubtotal = 0;
  let preorderBalance = 0; // saldo de preventa que se paga al recibir (no se cobra ahora)
  const orderItems: {
    product_id: string;
    variant_id: string;
    product_name: string;
    size: string | null;
    quantity: number;
    unit_price: number;
    // Sin `unit_cost`: el costo lo pone `storefront_create_order` leyéndolo de
    // la base. Acá ya no se puede, porque `unit_cost`, `packaging_cost` y
    // `variant_cost` dejaron de ser legibles con la clave pública — eran la
    // estructura de márgenes entera, visible para cualquiera (migración 0048).
    subtotal: number;
  }[] = [];
  const reservations: { variantId: string; quantity: number; current: number }[] = [];
  const itemNotes: string[] = []; // aclaraciones del cliente por ítem (ej: Mystery Box)

  for (const item of data.items) {
    const v = variants.find((x) => x.id === item.variantId);
    if (!v || !v.active) {
      return { ok: false, error: 'Un producto del carrito ya no está disponible.' };
    }
    const product = Array.isArray(v.products) ? v.products[0] : (v.products as any);
    // Si el producto se despublicó, la RLS del storefront lo deja fuera del
    // join y `product` viene vacío. Sin este corte el precio caía al `?? 0` de
    // más abajo y el pedido se creaba en $0, reservando stock igual: a quien
    // tenía la camiseta en el carrito le quedaba gratis.
    if (!product) {
      return { ok: false, error: 'Un producto del carrito ya no está disponible.' };
    }
    const available = (v.stock_physical || 0) - (v.stock_reserved || 0) - (v.encargo_reserved || 0);
    const allowBackorder = Boolean(product?.allow_backorder);

    if (available < item.quantity && !allowBackorder) {
      return {
        ok: false,
        error: `Sin stock suficiente de ${product?.name || 'un producto'} (talle ${v.size}).`,
      };
    }

    const listPrice = v.variant_price ?? product.price ?? 0;
    // Cinturón y tiradores: nada se vende en $0 por un dato faltante.
    if (!(listPrice > 0)) {
      return { ok: false, error: `No pudimos confirmar el precio de ${product.name}.` };
    }
    // Promo de línea (precio fijo) y después la del catálogo (porcentaje). Las
    // dos van antes del recargo por despacho: descuentan el producto, no el
    // costo de mandarlo.
    const promoPrice = precioPromoLinea(product.slug, listPrice);
    const trasPromoLinea = promoPrice ?? listPrice;
    promoLineaDiscount += (listPrice - trasPromoLinea) * item.quantity;
    const basePrice = applyDiscount(trasPromoLinea, salePct);
    saleDiscount += (trasPromoLinea - basePrice) * item.quantity;
    // Ventas nacionales: recargo por despacho (metido en el precio, no lo ve el cliente como aparte).
    const price = data.shipping_method === 'nacional' ? withNationalMarkup(basePrice) : basePrice;
    const lineSubtotal = price * item.quantity;
    subtotal += lineSubtotal;
    // Lo que está en promo de línea no recibe ningún otro descuento encima:
    // queda fuera de la base del cupón, del descuento de cliente y del de
    // transferencia. Un carrito mixto sí los recibe, sobre el resto.
    const enPromoLinea = promoPrice !== null;
    if (!enPromoLinea) discountableSubtotal += lineSubtotal;
    if (product?.transfer_discount !== false && !enPromoLinea) eligibleSubtotal += lineSubtotal;
    // Preventa: solo se cobra ahora la seña (50%); el resto queda como saldo a pagar al recibir.
    if (product?.preorder) {
      preorderBalance += (price - preorderDeposit(price)) * item.quantity;
    }
    orderItems.push({
      product_id: v.product_id,
      variant_id: v.id,
      product_name: product?.name ?? 'Producto',
      size: v.size,
      quantity: item.quantity,
      unit_price: price,
      subtotal: lineSubtotal,
    });

    reservations.push({
      variantId: v.id,
      quantity: item.quantity,
      current: v.stock_reserved || 0,
    });

    if (item.note && item.note.trim()) {
      itemNotes.push(`${product?.name ?? 'Producto'} → ${item.note.trim()}`);
    }
  }

  // 3. Cupón (revalidado en el servidor)
  // Con la promo activa el cupón se ignora, igual que en el checkout: así el
  // total que se cobra es exactamente el que vio el cliente.
  // El de bienvenida es la excepción a las dos reglas de no acumulación: corre
  // sobre el carrito ENTERO —promo de línea incluida— y no lo frena la promo
  // del catálogo. Es más chico justamente para poder combinarse.
  const esBienvenida = Boolean(data.coupon_code && isWelcomeCode(data.coupon_code));
  const saleBlocks = !esBienvenida && Boolean(couponBlockedBySale());
  // El resto corre sobre `discountableSubtotal`, que deja afuera lo que ya está
  // en promo de línea. Sin promo activa es igual a `subtotal`, así que para el
  // resto del catálogo nada cambia.
  const baseCupon = esBienvenida ? subtotal : discountableSubtotal;
  let couponResult: CouponResult | null = null;
  if (data.coupon_code && !saleBlocks) {
    couponResult = esBienvenida
      ? await validateWelcomeCoupon(supabase, data.coupon_code, baseCupon, data.email, data.phone, data.dni)
      : isLoyaltyCode(data.coupon_code)
        ? await validateLoyaltyCoupon(supabase, data.coupon_code, baseCupon, data.email)
        : await validateCoupon(supabase, data.coupon_code, baseCupon);
    if (!couponResult.valid) {
      return { ok: false, error: couponResult.message };
    }
  }

  // 3b. Descuento automático por ser cliente.
  // Se recalcula acá contra la base, sin mirar nada de lo que mandó el
  // navegador: el nivel no es un dato del formulario, es una consecuencia del
  // historial de compras. Lo que el cliente vio en pantalla es una vista.
  // El de fidelidad sigue sin acumularse con la promo del catálogo: la
  // excepción es solo para el de bienvenida, así que acá se mira la promo
  // directo y no `saleBlocks`, que ya trae esa excepción adentro.
  const loyalty = couponBlockedBySale()
    ? { percent: 0, orders: 0 }
    : await loyaltyForEmail(supabase, data.email);

  // El carnet de socio, contra la base y no contra lo que mandó el navegador:
  // ser socio es un hecho que vive en la base, igual que el nivel de fidelidad.
  const carnet = await socioParaEmail(supabase, data.email);
  const socioPercent = carnet.activo && !couponBlockedBySale() ? SOCIO.percent : 0;

  // Fidelidad y carnet premian lo mismo, así que no se suman: vale el mejor.
  const porEmailPercent = Math.max(loyalty.percent, socioPercent);
  const porEmailDiscount =
    porEmailPercent > 0 ? Math.round(discountableSubtotal * (porEmailPercent / 100)) : 0;
  const ganaElCarnet = socioPercent >= loyalty.percent && socioPercent > 0;

  // Los descuentos no se acumulan: se aplica el mejor de los dos y se avisa.
  // Que se lleve el mayor es lo que el cliente espera; sumarlos sería regalar
  // dos veces la misma compra.
  const rawCouponDiscount = couponResult?.valid ? couponResult.discount : 0;
  const loyaltyWins = porEmailDiscount > rawCouponDiscount;
  const couponDiscount = Math.max(rawCouponDiscount, porEmailDiscount);
  // Lo que queda asentado en el pedido, para que en el panel se entienda de
  // dónde salió el descuento aunque el cliente no haya tipeado ningún código.
  const discountCode = loyaltyWins
    ? ganaElCarnet
      ? `SOCIO-${socioPercent}`
      : `FIDELIDAD-${loyalty.percent}`
    : couponResult?.valid
      ? couponResult.code
      : null;

  // 4. Calcular totales
  const transferDiscount =
    data.payment_method === 'transfer' && transferPct > 0
      ? eligibleSubtotal - applyDiscount(eligibleSubtotal, transferPct)
      : 0;
  const discount = transferDiscount + couponDiscount;

  const shippingQuote = quoteShipping(data.shipping_method, settings.shipping);
  const calc = settings.shipping_calc as ShippingCalcSettings;
  // El cupón de envío gratis se resuelve ACÁ y no en `validateCoupon`: el que
  // descuenta plata baja el subtotal, este baja el envío. Son dos renglones
  // distintos del total y mezclarlos daba un pedido con el envío cobrado y el
  // mensaje diciendo que era gratis.
  // El socio no paga envío en Mar del Plata. Va aparte del descuento y NO lo
  // bloquea la promo del catálogo: es un beneficio que paga todos los meses y
  // que no tiene nada que ver con el precio de las camisetas. Al Correo sí se
  // le cobra: ahí el costo no lo pone la tienda, lo pone el correo.
  const envioSocio = carnet.activo && data.shipping_method !== 'nacional';
  const envioGratis =
    envioSocio || (couponResult?.valid === true && couponResult.freeShipping === true);
  const shippingCost = envioGratis ? 0 : await resolveShippingCost(data, calc);
  // En preventa se cobra ahora la seña: se descuenta del total el saldo que se paga al recibir.
  const baseTotal = Math.max(0, subtotal - discount - preorderBalance + shippingCost);
  // Recargo por pagar con Mercado Pago (impuestos).
  const mpFee = data.payment_method === 'mercadopago' ? mpSurcharge(baseTotal) : 0;
  const total = baseTotal + mpFee;

  // 5. Crear pedido vía RPC SECURITY DEFINER (intake seguro sin service role)
  const shippingLabel =
    shippingCost > 0
      ? `${shippingQuote.label} ($${shippingCost.toLocaleString('es-AR')})`
      : `${shippingQuote.label} (sin cargo)`;
  const shippingNote = shippingQuote.note;
  // Info de entrega para el admin: tipo de vivienda y horarios de disponibilidad (MdP).
  const deliveryInfo =
    data.shipping_method !== 'retiro'
      ? [
          data.housing_type
            ? `Vivienda: ${data.housing_type === 'departamento' ? 'Departamento' : 'Casa'}`
            : null,
          data.availability ? `Disponible: ${data.availability}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : '';
  const preorderNote =
    preorderBalance > 0
      ? `PREVENTA: seña cobrada ahora. Saldo a pagar al recibir: $${Math.round(preorderBalance).toLocaleString('es-AR')}`
      : '';
  const boxNote = itemNotes.length > 0 ? `Mystery Box · ${itemNotes.join(' | ')}` : '';
  // Queda asentado en el pedido: los unit_price ya vienen con la promo aplicada.
  const saleNote =
    saleDiscount > 0
      ? `PROMO ${salePct}% OFF aplicada: $${Math.round(saleDiscount).toLocaleString('es-AR')} de descuento`
      : '';
  // Igual que la promo del catálogo: los unit_price ya vienen con el precio de
  // promo, así que sin esta nota el total aparece más bajo sin explicación.
  const promoVigente = promoLineaVigente();
  const promoLineaNote =
    promoLineaDiscount > 0 && promoVigente
      ? `${promoVigente.label} (${promoVigente.subtitle}) — $${Math.round(promoLineaDiscount).toLocaleString('es-AR')} de descuento`
      : '';
  // Idem para el descuento por ser cliente: se aplica solo, sin código, así que
  // sin esta nota en el panel el total aparecería más bajo sin explicación.
  const loyaltyNote = !loyaltyWins
    ? ''
    : ganaElCarnet
      ? `${SOCIO.nombre.toUpperCase()} ${numeroDeSocio(carnet.numero)} ${socioPercent}%: $${porEmailDiscount.toLocaleString('es-AR')} de descuento`
      : `FIDELIDAD ${loyalty.percent}% (${loyalty.orders} ${
          loyalty.orders === 1 ? 'compra previa' : 'compras previas'
        }): $${porEmailDiscount.toLocaleString('es-AR')} de descuento`;
  // El envío sin cargo del socio también se deja asentado: en el panel un envío
  // en $0 sin explicación parece un error de cálculo.
  const socioEnvioNote =
    envioSocio && !(couponResult?.valid === true && couponResult.freeShipping === true)
      ? `Envío sin cargo por ${SOCIO.nombre} ${numeroDeSocio(carnet.numero)}`
      : '';
  const combinedNotes = [
    data.notes,
    deliveryInfo,
    preorderNote,
    boxNote,
    saleNote,
    promoLineaNote,
    loyaltyNote,
    socioEnvioNote,
    shippingNote,
  ]
    .filter(Boolean)
    .join(' · ');

  // En MdP y retiro la provincia/ciudad se autocompletan (son locales).
  const isLocal = data.shipping_method !== 'nacional';
  const effProvince = isLocal ? 'Buenos Aires' : data.province;
  const effCity = isLocal ? 'Mar del Plata' : data.city;

  const payload = {
    coupon_code: discountCode,
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
      coupon_code: discountCode,
      coupon_discount: couponDiscount,
      shipping_cost: shippingCost,
      total,
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
    // La reserva de stock corre condicionada dentro del RPC: si entre el
    // control de arriba y ese momento entró otro pedido por la misma última
    // camiseta, corta con SIN_STOCK. Decirle "intentá de nuevo" a alguien que
    // se quedó sin la camiseta es mandarlo a reintentar algo que no va a
    // funcionar nunca; mejor que sepa qué pasó.
    const agotado = (rpcErr?.message || '').startsWith('SIN_STOCK:');
    if (agotado) {
      const nombre = rpcErr!.message.slice('SIN_STOCK:'.length).trim();
      return {
        ok: false,
        error: nombre
          ? `Se agotó ${nombre} mientras completabas el pedido. Sacalo del carrito para seguir.`
          : 'Se agotó un producto del carrito mientras completabas el pedido.',
      };
    }
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
