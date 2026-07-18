'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { useCart } from '@/components/cart/CartProvider';
import {
  applyDiscount,
  availableStock,
  cn,
  formatPrice,
  whatsappLink,
} from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { requestStock } from '@/app/(store)/producto/[slug]/actions';

interface Props {
  product: Product;
  transferDiscount: number;
  whatsappNumber: string;
  siteUrl: string;
  compact?: boolean;
}

export function ProductPurchase({
  product,
  transferDiscount,
  whatsappNumber,
  siteUrl,
  compact = false,
}: Props) {
  const { addItem } = useCart();
  const variants = (product.variants ?? []).filter((v) => v.active);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [notifyPhone, setNotifyPhone] = useState('');
  const [notifySizes, setNotifySizes] = useState<string[]>([]);
  const [notifyDone, setNotifyDone] = useState(false);
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyErr, setNotifyErr] = useState<string | null>(null);

  const selected = variants.find((v) => v.id === variantId) || null;
  const image = product.images?.[0]?.url ?? null;
  const transferEligible = product.transfer_discount !== false;
  const showTransfer = transferDiscount > 0 && transferEligible;
  const transferPrice = applyDiscount(product.price, transferDiscount);
  const canBackorder = product.allow_backorder;
  const hasCompare = product.compare_at_price && product.compare_at_price > product.price;
  const hasOutOfStock = variants.some((v) => availableStock(v) <= 0);
  const oosVariants = variants.filter((v) => availableStock(v) <= 0);

  function toggleNotifySize(size: string) {
    setNotifyErr(null);
    setNotifySizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size],
    );
  }

  async function submitNotify() {
    const phone = notifyPhone.replace(/[^\d]/g, '');
    if (phone.length < 6) {
      setNotifyErr('Ingresá un WhatsApp válido (con característica).');
      return;
    }
    let chosen = oosVariants.filter((v) => notifySizes.includes(v.size || ''));
    if (chosen.length === 0 && oosVariants.length === 1) chosen = oosVariants;
    if (chosen.length === 0) {
      setNotifyErr('Elegí el/los talle(s) que buscás.');
      return;
    }
    setNotifyBusy(true);
    setNotifyErr(null);
    const res = await requestStock({
      productId: product.id,
      productName: product.name,
      phone: notifyPhone.trim(),
      sizes: chosen.map((v) => ({ size: v.size, variantId: v.id })),
    });
    setNotifyBusy(false);
    if (res.error) setNotifyErr(res.error);
    else {
      setNotifyDone(true);
      trackEvent('StockRequest', { product: product.slug });
    }
  }

  const stockMessage = `Hola! Quería consultar stock de: ${product.name}. ${siteUrl}/producto/${product.slug}`;

  function handleAdd() {
    if (!selected) {
      setError('Elegí un talle.');
      return;
    }
    const stock = availableStock(selected);
    if (stock <= 0 && !canBackorder) {
      setError('Sin stock en ese talle.');
      return;
    }
    setError(null);
    addItem({
      productId: product.id,
      variantId: selected.id,
      slug: product.slug,
      name: product.name,
      size: selected.size || '-',
      price: product.price,
      image,
      quantity: qty,
      maxStock: canBackorder ? 99 : stock,
      transferEligible,
    });
  }

  const consultMessage = [
    'Hola, quería consultar por:',
    product.name,
    selected ? `Talle: ${selected.size}` : '',
    `Precio: ${formatPrice(product.price)}`,
    `Link: ${siteUrl}/producto/${product.slug}`,
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <div className="space-y-5">
      {/* Precio */}
      <div>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-3xl font-black text-navy">{formatPrice(product.price)}</span>
          {hasCompare && (
            <span className="text-lg text-navy/35 line-through">
              {formatPrice(product.compare_at_price as number)}
            </span>
          )}
        </div>
        {showTransfer && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-celeste/15 px-3 py-1.5">
            <span className="text-sm font-bold text-navy">{formatPrice(transferPrice)}</span>
            <span className="text-xs font-semibold text-navy/65">
              por transferencia · {transferDiscount}% OFF
            </span>
          </div>
        )}
      </div>

      {/* Talles */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-navy">Talle</span>
          <Link
            href="/guia-de-talles"
            className="text-xs font-semibold text-navy/55 underline underline-offset-2 hover:text-navy"
          >
            Guía de talles
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {variants.map((v) => {
            const stock = availableStock(v);
            const disabled = stock <= 0 && !canBackorder;
            const isSel = v.id === variantId;
            return (
              <button
                key={v.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setVariantId(v.id);
                  setError(null);
                }}
                className={cn(
                  'min-w-[3rem] rounded-xl border-2 px-3.5 py-2.5 text-sm font-bold transition',
                  isSel
                    ? 'border-navy bg-navy text-cream shadow-soft'
                    : 'border-navy/15 bg-white text-navy hover:border-navy',
                  disabled &&
                    'cursor-not-allowed border-navy/10 bg-navy/[0.03] text-navy/25 line-through hover:border-navy/10',
                )}
              >
                {v.size}
              </button>
            );
          })}
        </div>
        {selected && (
          <p className="mt-2 text-xs font-medium text-navy/60">
            {availableStock(selected) > 0
              ? availableStock(selected) <= (selected.stock_minimum || 0) + 2
                ? 'Últimas unidades disponibles'
                : 'Disponible'
              : canBackorder
                ? 'Sin stock — se acepta pedido a coordinar'
                : 'Sin stock'}
          </p>
        )}

        {hasOutOfStock && (
          <a
            href={whatsappLink(whatsappNumber, stockMessage)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('WhatsAppClick', { source: 'stock', product: product.slug })}
            className="mt-3 flex items-start gap-2.5 rounded-xl border border-celeste/40 bg-celeste/15 p-3 text-sm font-medium text-navy transition hover:bg-celeste/25"
          >
            <svg className="mt-0.5 shrink-0 text-[#25D366]" width="18" height="18" viewBox="0 0 32 32" fill="currentColor" aria-hidden>
              <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.8.7 5.4 2 7.8L.5 31.5l7.9-2c2.3 1.2 4.9 1.9 7.6 1.9 8.6 0 15.5-6.9 15.5-15.5S24.6.5 16 .5zm0 28.3c-2.4 0-4.7-.7-6.7-1.9l-.5-.3-4.7 1.2 1.3-4.6-.3-.5a12.8 12.8 0 0 1-2-6.9C3.1 8.9 8.9 3.2 16 3.2c3.4 0 6.6 1.3 9 3.8 2.4 2.4 3.8 5.6 3.8 9 0 7.1-5.8 12.8-12.8 12.8z" />
            </svg>
            <span>Si no hay stock de tu talle hablamos al WhatsApp que seguro algo tenemos 😁🇦🇷⚽️</span>
          </a>
        )}

        {hasOutOfStock &&
          (notifyDone ? (
            <p className="mt-2 rounded-xl bg-green-50 p-3 text-sm font-medium text-green-700">
              ¡Listo! Anotamos tu WhatsApp y te avisamos apenas entre stock. 🙌
            </p>
          ) : (
            <div className="mt-2 rounded-xl border border-navy/10 p-3">
              <p className="text-sm font-semibold text-navy">
                ¿No está tu talle? Dejanos tu WhatsApp y te avisamos apenas entre.
              </p>
              <p className="mt-2 text-xs font-medium text-navy/55">Elegí el/los talle(s) que buscás:</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {oosVariants.map((v) => {
                  const size = v.size || '-';
                  const on = notifySizes.includes(v.size || '');
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleNotifySize(v.size || '')}
                      className={cn(
                        'min-w-[2.75rem] rounded-lg border-2 px-3 py-1.5 text-sm font-bold transition',
                        on ? 'border-navy bg-navy text-cream' : 'border-navy/15 bg-white text-navy hover:border-navy',
                      )}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                <input
                  type="tel"
                  inputMode="numeric"
                  value={notifyPhone}
                  onChange={(e) => {
                    setNotifyPhone(e.target.value);
                    setNotifyErr(null);
                  }}
                  placeholder="Tu WhatsApp (ej: 2235555555)"
                  className="input !py-2 flex-1"
                />
                <button
                  type="button"
                  onClick={submitNotify}
                  disabled={notifyBusy}
                  className="btn-primary !py-2"
                >
                  {notifyBusy ? '…' : 'Avisame'}
                </button>
              </div>
              {notifyErr && <p className="mt-1 text-xs text-red-600">{notifyErr}</p>}
            </div>
          ))}
      </div>

      {/* Cantidad */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-navy">Cantidad</span>
        <div className="flex items-center rounded-full border-2 border-navy/15">
          <button
            type="button"
            className="px-3.5 py-1.5 text-lg font-bold text-navy/70 transition hover:text-navy"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Restar"
          >
            −
          </button>
          <span className="min-w-8 text-center text-sm font-bold">{qty}</span>
          <button
            type="button"
            className="px-3.5 py-1.5 text-lg font-bold text-navy/70 transition hover:text-navy"
            onClick={() => setQty((q) => q + 1)}
            aria-label="Sumar"
          >
            +
          </button>
        </div>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      {/* CTAs */}
      <div className="flex flex-col gap-2.5">
        <button type="button" onClick={handleAdd} className="btn-primary w-full text-base">
          Agregar al carrito
        </button>
        <a
          href={whatsappLink(whatsappNumber, consultMessage)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('WhatsAppClick', { source: 'product', product: product.slug })}
          className="btn-wsp w-full"
        >
          Consultar por WhatsApp
        </a>
      </div>

      {!compact && (
        <ul className="space-y-2 border-t border-navy/10 pt-4 text-sm text-navy/75">
          {[
            'Envíos a todo el país',
            'Entrega gratis en Mar del Plata',
            ...(showTransfer ? ['Descuento pagando por transferencia'] : []),
          ].map((b) => (
            <li key={b} className="flex items-center gap-2.5">
              <CheckIcon />
              {b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-celeste/25">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0B1F3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}
