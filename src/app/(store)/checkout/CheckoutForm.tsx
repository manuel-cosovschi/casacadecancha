'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCart } from '@/components/cart/CartProvider';
import { getAttribution } from '@/components/store/UtmCapture';
import { createOrder, applyCoupon, saveCart, estimateMdpShipping } from './actions';
import { checkoutSchema, type CheckoutInput } from '@/lib/validation';
import { AR_PROVINCES } from '@/lib/provinces';
import { discountAmount, formatPrice, mpSurcharge, MP_SURCHARGE_PCT } from '@/lib/utils';
import { computeNationalShipping, parseZones, withNationalMarkup } from '@/lib/shipping';
import type { ShippingSettings, ShippingCalcSettings } from '@/lib/types';
import { trackEvent } from '@/lib/analytics';

interface Props {
  transferDiscount: number;
  transferText: string;
  shipping: ShippingSettings;
  shippingCalc: ShippingCalcSettings;
}

export function CheckoutForm({ transferDiscount, transferText, shipping, shippingCalc }: Props) {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponOk, setCouponOk] = useState(false);
  const [couponBusy, setCouponBusy] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shipping_method: 'mdp',
      payment_method: 'transfer',
      items: [],
    },
  });

  // Los ítems vienen del carrito, no de inputs del form: los sincronizamos en el
  // estado del form para que la validación (items.min(1)) no bloquee el submit.
  useEffect(() => {
    setValue(
      'items',
      items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
    );
  }, [items, setValue]);

  // Estado del cálculo de envío en Mar del Plata.
  const [mdpCost, setMdpCost] = useState<number | null>(shippingCalc?.mdp_charge ? null : 0);
  const [mdpInfo, setMdpInfo] = useState<string | null>(null);
  const [mdpNeedsZone, setMdpNeedsZone] = useState(false);
  const [mdpZone, setMdpZone] = useState('');
  const [mdpEstimating, setMdpEstimating] = useState(false);
  const zones = parseZones(shippingCalc?.zones);

  const paymentMethod = watch('payment_method');
  const shippingMethod = (watch('shipping_method') || 'mdp') as 'mdp' | 'nacional' | 'retiro';
  const isNacional = shippingMethod === 'nacional';
  const isRetiro = shippingMethod === 'retiro';
  const province = watch('province');
  // El descuento por transferencia solo aplica a los productos elegibles.
  const eligibleSubtotal = items.reduce(
    (a, i) => a + (i.transferEligible !== false ? i.price * i.quantity : 0),
    0,
  );
  const showTransfer = !isRetiro && paymentMethod === 'transfer' && transferDiscount > 0;
  const transferDisc = showTransfer ? discountAmount(eligibleSubtotal, transferDiscount) : 0;
  const discount = transferDisc + couponDiscount;

  // Precio a mostrar por ítem: en ventas nacionales, con el recargo metido en el precio.
  const linePrice = (i: { price: number }) => (isNacional ? withNationalMarkup(i.price) : i.price);
  const displaySubtotal = isNacional
    ? items.reduce((a, i) => a + withNationalMarkup(i.price) * i.quantity, 0)
    : subtotal;

  // Costo de envío efectivo.
  const nationalCost = province ? computeNationalShipping(province, shippingCalc) : null;
  const shippingCost = isRetiro ? 0 : isNacional ? nationalCost ?? 0 : mdpCost ?? 0;
  const shippingKnown = isRetiro ? true : isNacional ? nationalCost !== null : mdpCost !== null;
  const baseTotal = Math.max(0, displaySubtotal - discount + shippingCost);
  // Recargo por pagar con Mercado Pago (impuestos), como renglón aparte.
  const mpFee = !isRetiro && paymentMethod === 'mercadopago' ? mpSurcharge(baseTotal) : 0;
  const total = baseTotal + mpFee;

  async function calcMdp() {
    const addr = [watch('address'), watch('address_number')].filter(Boolean).join(' ').trim();
    if (addr.length < 3) {
      setMdpInfo('Completá tu dirección y altura para calcular.');
      return;
    }
    setMdpEstimating(true);
    setMdpInfo(null);
    const res = await estimateMdpShipping(addr);
    setMdpEstimating(false);
    if (res.needsZone) {
      setMdpNeedsZone(true);
      setMdpCost(null);
      setMdpInfo('No pudimos ubicar tu dirección. Elegí tu zona para calcular el envío.');
    } else {
      setMdpNeedsZone(false);
      setMdpCost(res.cost);
      setMdpInfo(
        res.cost > 0
          ? `Envío a tu domicilio${res.km ? ` (~${res.km} km)` : ''}: ${formatPrice(res.cost)}`
          : 'Entrega sin cargo.',
      );
    }
  }

  function pickZone(name: string) {
    setMdpZone(name);
    const z = zones.find((x) => x.name === name);
    setMdpCost(z ? z.cost : null);
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponBusy(true);
    setCouponMsg(null);
    const res = await applyCoupon(couponCode.trim(), subtotal);
    setCouponBusy(false);
    setCouponOk(res.valid);
    setCouponDiscount(res.valid ? res.discount : 0);
    setCouponMsg(res.message);
  }

  async function onSubmit(values: CheckoutInput) {
    if (items.length === 0) {
      setServerError('Tu carrito está vacío.');
      return;
    }
    if (!isNacional && !isRetiro && shippingCalc?.mdp_charge && mdpCost === null) {
      setServerError('Calculá el costo de envío en Mar del Plata antes de confirmar.');
      return;
    }
    setSubmitting(true);
    setServerError(null);
    trackEvent('InitiateCheckout', { value: total, currency: 'ARS' });

    const payload: CheckoutInput = {
      ...values,
      payment_method: isRetiro ? 'cash' : values.payment_method,
      coupon_code: couponOk ? couponCode.trim() : undefined,
      mdp_zone: mdpNeedsZone ? mdpZone : undefined,
      shipping_cost: shippingCost,
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
      attribution: getAttribution(),
    };

    const result = await createOrder(payload);
    if (result.ok && result.orderNumber) {
      trackEvent('Purchase', {
        value: total,
        currency: 'ARS',
        order: result.orderNumber,
      });
      clear();
      router.push(
        `/pedido/${result.orderNumber}?method=${isRetiro ? 'retiro' : values.payment_method}`,
      );
    } else {
      setServerError(result.error || 'Ocurrió un error.');
      setSubmitting(false);
    }
  }

  // Si la validación del form falla, avisamos (evita que el botón quede "mudo").
  function onInvalid() {
    setServerError('Revisá el formulario: hay datos incompletos o con errores más arriba.');
  }

  if (items.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-navy/60">Tu carrito está vacío.</p>
        <Link href="/camisetas" className="btn-celeste mt-4 inline-flex">
          Ver camisetas
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Datos del cliente */}
        <fieldset className="card p-5">
          <legend className="px-2 text-sm font-bold uppercase tracking-wide text-navy/60">
            Tus datos
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" error={errors.first_name?.message}>
              <input className="input" {...register('first_name')} />
            </Field>
            <Field label="Apellido" error={errors.last_name?.message}>
              <input className="input" {...register('last_name')} />
            </Field>
            <Field label="WhatsApp" error={errors.phone?.message}>
              <input className="input" placeholder="Ej: 2235555555" {...register('phone')} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input
                className="input"
                type="email"
                {...register('email', {
                  onBlur: (e) => {
                    const email = e.target.value;
                    if (email.includes('@') && items.length > 0) {
                      saveCart({
                        email,
                        phone: (watch('phone') as string) || null,
                        items: items.map((i) => ({
                          name: i.name,
                          quantity: i.quantity,
                          size: i.size,
                          price: i.price,
                        })),
                        subtotal,
                      });
                    }
                  },
                })}
              />
            </Field>
            <Field label="DNI (opcional)" error={errors.dni?.message}>
              <input className="input" {...register('dni')} />
            </Field>
          </div>
        </fieldset>

        {/* Envío */}
        <fieldset className="card p-5">
          <legend className="px-2 text-sm font-bold uppercase tracking-wide text-navy/60">
            Entrega
          </legend>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-navy/15 p-3 text-sm">
              <input type="radio" value="mdp" {...register('shipping_method')} className="mt-1" />
              <div>
                <p className="font-semibold">Soy de Mar del Plata</p>
                <p className="text-navy/60">
                  {shippingCalc?.mdp_charge
                    ? 'Entrega a domicilio. El costo depende de la distancia — si estás cerca, el envío es gratis.'
                    : 'Coordinamos la entrega por WhatsApp, sin cargo.'}
                </p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-navy/15 p-3 text-sm">
              <input type="radio" value="nacional" {...register('shipping_method')} className="mt-1" />
              <div>
                <p className="font-semibold">Soy del resto del país</p>
                <p className="text-navy/60">Envío por Correo Argentino a todo el país.</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-navy/15 p-3 text-sm">
              <input type="radio" value="retiro" {...register('shipping_method')} className="mt-1" />
              <div>
                <p className="font-semibold">Retiro en punto de retiro (zona Av. Constitución, Mar del Plata)</p>
                <p className="text-navy/60">Sin costo de envío. Coordinamos el retiro y la seña por WhatsApp.</p>
              </div>
            </label>
          </div>

          {isRetiro ? (
            <div className="mt-4 rounded-lg bg-celeste/15 p-3 text-sm text-navy">
              🤝 El retiro es en la <strong>zona de Av. Constitución (Mar del Plata)</strong>. Al
              confirmar te llevamos a <strong>WhatsApp</strong> con tu pedido armado para coordinar
              el punto exacto y la seña. El resto lo pagás cuando lo retirás.
            </div>
          ) : isNacional ? (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Provincia" error={errors.province?.message}>
                  <select className="input" {...register('province')}>
                    <option value="">Elegí una provincia</option>
                    {AR_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Ciudad" error={errors.city?.message}>
                  <input className="input" {...register('city')} />
                </Field>
                <Field label="Código postal" error={errors.postal_code?.message}>
                  <input className="input" {...register('postal_code')} />
                </Field>
                <Field label="Dirección" error={errors.address?.message}>
                  <input className="input" {...register('address')} />
                </Field>
                <Field label="Altura" error={errors.address_number?.message}>
                  <input className="input" {...register('address_number')} />
                </Field>
                <Field label="Piso / Depto (opcional)" error={errors.floor?.message}>
                  <input className="input" {...register('floor')} />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Referencias / Notas (opcional)">
                  <textarea className="input min-h-20" {...register('references')} />
                </Field>
              </div>
              <div className="mt-4 rounded-lg bg-celeste/15 p-3 text-sm text-navy">
                📦 Enviamos por <strong>Correo Argentino</strong>.{' '}
                {nationalCost !== null
                  ? <>Costo estimado del envío: <strong>{formatPrice(nationalCost)}</strong>.</>
                  : 'Elegí tu provincia para calcular el costo del envío.'}
              </div>
            </>
          ) : shippingCalc?.mdp_charge ? (
            <>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Dirección" error={errors.address?.message}>
                  <input className="input" {...register('address')} placeholder="Ej: Av. Colón" />
                </Field>
                <Field label="Altura" error={errors.address_number?.message}>
                  <input className="input" {...register('address_number')} placeholder="Ej: 1168" />
                </Field>
                <Field label="Piso / Depto (opcional)" error={errors.floor?.message}>
                  <input className="input" {...register('floor')} />
                </Field>
                <Field label="Referencias (opcional)">
                  <input className="input" {...register('references')} placeholder="Entre calles, timbre…" />
                </Field>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={calcMdp}
                  disabled={mdpEstimating}
                  className="btn border-2 border-navy text-navy hover:bg-navy hover:text-cream !py-2"
                >
                  {mdpEstimating ? 'Calculando…' : 'Calcular costo de envío'}
                </button>
                <p className="mt-2 text-xs text-navy/50">
                  El envío se calcula según la distancia hasta tu domicilio. Si estás cerca del local,
                  es <strong>gratis</strong>.
                </p>
              </div>
              {mdpNeedsZone && (
                <div className="mt-3">
                  <Field label="Elegí tu zona">
                    <select className="input" value={mdpZone} onChange={(e) => pickZone(e.target.value)}>
                      <option value="">Elegí tu zona…</option>
                      {zones.map((z) => (
                        <option key={z.name} value={z.name}>
                          {z.name} — {formatPrice(z.cost)}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
              {mdpInfo && (
                <div className="mt-3 rounded-lg bg-celeste/15 p-3 text-sm font-medium text-navy">
                  🛵 {mdpInfo}
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 rounded-lg bg-celeste/15 p-3 text-sm text-navy">
              🛵 Coordinamos la entrega en Mar del Plata por WhatsApp, <strong>sin costo de envío</strong>.
              Dejanos tus datos de contacto arriba y te escribimos.
            </div>
          )}
        </fieldset>

        {/* Pago */}
        {!isRetiro && (
        <fieldset className="card p-5">
          <legend className="px-2 text-sm font-bold uppercase tracking-wide text-navy/60">
            Medio de pago
          </legend>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-navy/15 p-3">
              <input type="radio" value="transfer" {...register('payment_method')} className="mt-1" />
              <div>
                <p className="font-semibold">Transferencia bancaria</p>
                <p className="text-sm text-navy/60">{transferText}</p>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-navy/15 p-3">
              <input type="radio" value="mercadopago" {...register('payment_method')} className="mt-1" />
              <div>
                <p className="font-semibold">Mercado Pago</p>
                <p className="text-sm text-navy/60">
                  Pagás con el link de Mercado Pago y nos enviás el comprobante por WhatsApp.
                </p>
              </div>
            </label>
          </div>
        </fieldset>
        )}

        {serverError && (
          <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
            {serverError}
          </p>
        )}
      </div>

      {/* Resumen */}
      <aside className="card h-fit p-5 lg:sticky lg:top-20">
        <h2 className="mb-4 text-lg font-bold">Tu pedido</h2>
        <ul className="space-y-2 border-b border-navy/10 pb-3 text-sm">
          {items.map((i) => (
            <li key={i.variantId} className="flex justify-between gap-2">
              <span className="text-navy/70">
                {i.quantity}× {i.name} <span className="text-navy/40">({i.size})</span>
              </span>
              <span className="font-medium">{formatPrice(linePrice(i) * i.quantity)}</span>
            </li>
          ))}
        </ul>
        {/* Cupón */}
        <div className="border-t border-navy/10 py-3">
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Código de cupón"
              className="input !py-2 flex-1 text-sm"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={couponBusy || !couponCode.trim()}
              className="btn border-2 border-navy text-navy hover:bg-navy hover:text-cream !px-4 !py-2"
            >
              {couponBusy ? '…' : 'Aplicar'}
            </button>
          </div>
          {couponMsg && (
            <p className={`mt-1.5 text-xs font-medium ${couponOk ? 'text-green-600' : 'text-red-600'}`}>
              {couponMsg}
            </p>
          )}
        </div>

        <div className="space-y-1.5 py-3 text-sm">
          <Row label="Subtotal" value={formatPrice(displaySubtotal)} />
          {showTransfer && (
            <Row label={`Descuento transferencia (${transferDiscount}%)`} value={`- ${formatPrice(transferDisc)}`} accent />
          )}
          {couponDiscount > 0 && (
            <Row label="Cupón" value={`- ${formatPrice(couponDiscount)}`} accent />
          )}
          <Row
            label="Envío"
            value={
              !shippingKnown
                ? 'A calcular'
                : shippingCost === 0
                  ? 'Gratis'
                  : formatPrice(shippingCost)
            }
            muted={!shippingKnown}
          />
          {mpFee > 0 && (
            <Row label={`Recargo Mercado Pago (${MP_SURCHARGE_PCT}%)`} value={`+ ${formatPrice(mpFee)}`} />
          )}
        </div>
        <div className="flex justify-between border-t border-navy/10 pt-3 text-lg font-bold">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
        {(showTransfer || couponDiscount > 0) && (
          <p className="mt-2 rounded-lg bg-celeste/20 p-2 text-center text-xs font-semibold text-navy">
            Ahorrás {formatPrice(discount)} en esta compra
          </p>
        )}
        {serverError && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
            {serverError}
          </p>
        )}
        <button type="submit" disabled={submitting} className="btn-primary mt-4 w-full">
          {submitting ? 'Procesando…' : isRetiro ? 'Coordinar por WhatsApp' : 'Confirmar pedido'}
        </button>
        <p className="mt-2 text-center text-xs text-navy/50">
          {isRetiro
            ? 'Al confirmar te derivamos a WhatsApp para coordinar la seña y el retiro.'
            : 'Al confirmar registramos tu pedido y coordinamos el pago.'}
        </p>
      </aside>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function Row({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-navy/60">{label}</span>
      <span className={accent ? 'font-semibold text-green-600' : muted ? 'text-navy/50' : 'font-medium'}>
        {value}
      </span>
    </div>
  );
}
