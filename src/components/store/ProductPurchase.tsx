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

  const selected = variants.find((v) => v.id === variantId) || null;
  const image = product.images?.[0]?.url ?? null;
  const transferPrice = applyDiscount(product.price, transferDiscount);
  const canBackorder = product.allow_backorder;

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
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-extrabold text-navy">
            {formatPrice(product.price)}
          </span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-lg text-navy/40 line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>
        {transferDiscount > 0 && (
          <p className="mt-1 text-sm font-semibold text-navy">
            {formatPrice(transferPrice)}{' '}
            <span className="font-normal text-navy/60">
              pagando por transferencia ({transferDiscount}% OFF)
            </span>
          </p>
        )}
      </div>

      {/* Talles */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Talle</span>
          <Link href="/guia-de-talles" className="text-xs font-medium text-navy/60 underline">
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
                  'min-w-12 rounded-lg border px-3 py-2 text-sm font-semibold transition',
                  isSel
                    ? 'border-navy bg-navy text-cream'
                    : 'border-navy/20 text-navy hover:border-navy',
                  disabled &&
                    'cursor-not-allowed border-navy/10 text-navy/30 line-through hover:border-navy/10',
                )}
              >
                {v.size}
              </button>
            );
          })}
        </div>
        {selected && (
          <p className="mt-2 text-xs text-navy/60">
            {availableStock(selected) > 0
              ? availableStock(selected) <= (selected.stock_minimum || 0) + 2
                ? 'Últimas unidades'
                : 'Disponible'
              : canBackorder
                ? 'Sin stock — se acepta pedido a coordinar'
                : 'Sin stock'}
          </p>
        )}
      </div>

      {/* Cantidad */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Cantidad</span>
        <div className="flex items-center rounded-full border border-navy/20">
          <button
            type="button"
            className="px-3 py-1.5 text-navy/70"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Restar"
          >
            −
          </button>
          <span className="min-w-8 text-center text-sm font-semibold">{qty}</span>
          <button
            type="button"
            className="px-3 py-1.5 text-navy/70"
            onClick={() => setQty((q) => q + 1)}
            aria-label="Sumar"
          >
            +
          </button>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      {/* CTAs */}
      <div className="flex flex-col gap-2">
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
        <ul className="space-y-1.5 pt-2 text-sm text-navy/70">
          <li>✓ Envíos a todo el país</li>
          <li>✓ Atención personalizada por WhatsApp</li>
          <li>✓ Descuento pagando por transferencia</li>
        </ul>
      )}
    </div>
  );
}
