'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCart } from '@/components/cart/CartProvider';
import { getAttribution } from '@/components/store/UtmCapture';
import { createOrder, applyCoupon } from './actions';
import { checkoutSchema, type CheckoutInput } from '@/lib/validation';
import { AR_PROVINCES } from '@/lib/provinces';
import { discountAmount, formatPrice } from '@/lib/utils';
import { quoteShipping } from '@/lib/shipping';
import type { ShippingSettings } from '@/lib/types';
import { trackEvent } from '@/lib/analytics';

interface Props {
  transferDiscount: number;
  transferText: string;
  shipping: ShippingSettings;
}

export function CheckoutForm({ transferDiscount, transferText, shipping }: Props) {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponOk, setCouponOk] = useState(false);
  const [couponFreeShip, setCouponFreeShip] = useState(false);
  const [couponBusy, setCouponBusy] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shipping_method: 'coordinar',
      payment_method: 'transfer',
      items: [],
    },
  });

  const paymentMethod = watch('payment_method');
  const shippingMethod = (watch('shipping_method') || 'coordinar') as
    | 'nacional'
    | 'retiro'
    | 'coordinar';
  const showTransfer = paymentMethod === 'transfer' && transferDiscount > 0;
  const transferDisc = showTransfer ? discountAmount(subtotal, transferDiscount) : 0;
  const discount = transferDisc + couponDiscount;
  const shippingQuote = quoteShipping(
    shippingMethod,
    shipping,
    subtotal - couponDiscount,
    couponFreeShip,
  );
  const total = Math.max(0, subtotal - discount + shippingQuote.cost);

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponBusy(true);
    setCouponMsg(null);
    const res = await applyCoupon(couponCode.trim(), subtotal);
    setCouponBusy(false);
    setCouponOk(res.valid);
    setCouponDiscount(res.valid ? res.discount : 0);
    setCouponFreeShip(res.valid && res.discount === 0 && /envío gratis/i.test(res.message));
    setCouponMsg(res.message);
  }

  async function onSubmit(values: CheckoutInput) {
    if (items.length === 0) {
      setServerError('Tu carrito está vacío.');
      return;
    }
    setSubmitting(true);
    setServerError(null);
    trackEvent('InitiateCheckout', { value: total, currency: 'ARS' });

    const payload: CheckoutInput = {
      ...values,
      coupon_code: couponOk ? couponCode.trim() : undefined,
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
        `/pedido/${result.orderNumber}?method=${values.payment_method}`,
      );
    } else {
      setServerError(result.error || 'Ocurrió un error.');
      setSubmitting(false);
    }
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
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-8 lg:grid-cols-3">
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
              <input className="input" type="email" {...register('email')} />
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
            {[
              { value: 'coordinar', label: 'Envío a coordinar según localidad' },
              { value: 'nacional', label: 'Envío nacional' },
              { value: 'retiro', label: 'Retiro en Mar del Plata' },
            ].map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 rounded-lg border border-navy/15 p-3 text-sm">
                <input type="radio" value={opt.value} {...register('shipping_method')} />
                {opt.label}
              </label>
            ))}
          </div>

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
        </fieldset>

        {/* Pago */}
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
              <span className="font-medium">{formatPrice(i.price * i.quantity)}</span>
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
          <Row label="Subtotal" value={formatPrice(subtotal)} />
          {showTransfer && (
            <Row label={`Descuento transferencia (${transferDiscount}%)`} value={`- ${formatPrice(transferDisc)}`} accent />
          )}
          {couponDiscount > 0 && (
            <Row label="Cupón" value={`- ${formatPrice(couponDiscount)}`} accent />
          )}
          <Row
            label="Envío"
            value={
              shippingQuote.toCoordinate
                ? 'A coordinar'
                : shippingQuote.cost === 0
                  ? 'Gratis'
                  : formatPrice(shippingQuote.cost)
            }
            muted={shippingQuote.toCoordinate}
          />
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
        <button type="submit" disabled={submitting} className="btn-primary mt-4 w-full">
          {submitting ? 'Procesando…' : 'Confirmar pedido'}
        </button>
        <p className="mt-2 text-center text-xs text-navy/50">
          Al confirmar registramos tu pedido y coordinamos el pago.
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
