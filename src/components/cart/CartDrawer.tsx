'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/cart/CartProvider';
import {
  applyDiscount,
  discountAmount,
  formatPrice,
} from '@/lib/utils';

export function CartDrawer({ transferDiscount }: { transferDiscount: number }) {
  const { items, isOpen, close, subtotal, updateQuantity, removeItem, count } =
    useCart();

  const transferTotal = applyDiscount(subtotal, transferDiscount);
  const saving = discountAmount(subtotal, transferDiscount);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={close}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-cream shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Carrito de compras"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-navy/10 p-4">
          <h2 className="text-lg font-bold">Tu carrito ({count})</h2>
          <button onClick={close} aria-label="Cerrar carrito" className="text-navy/60 hover:text-navy">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-navy/60">Tu carrito está vacío.</p>
            <button onClick={close} className="btn-celeste">
              Ver camisetas
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.variantId} className="flex gap-3 card p-3">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-navy/5">
                      {item.image && (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight">{item.name}</p>
                        <button
                          onClick={() => removeItem(item.variantId)}
                          aria-label="Eliminar"
                          className="text-navy/40 hover:text-red-500"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-navy/60">Talle {item.size}</p>
                      <div className="mt-auto flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-navy/15">
                          <button
                            className="px-2.5 py-1 text-navy/70"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            aria-label="Restar"
                          >
                            −
                          </button>
                          <span className="min-w-6 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            className="px-2.5 py-1 text-navy/70"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            aria-label="Sumar"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-bold">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-navy/10 p-4">
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-navy/70">Subtotal</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              {transferDiscount > 0 && (
                <div className="mb-3 rounded-lg bg-celeste/20 p-2.5 text-center text-sm font-semibold text-navy">
                  Ahorrás {formatPrice(saving)} pagando por transferencia
                  <div className="text-xs font-normal text-navy/70">
                    Total transferencia: {formatPrice(transferTotal)}
                  </div>
                </div>
              )}
              <Link href="/checkout" onClick={close} className="btn-primary w-full">
                Finalizar compra
              </Link>
              <button onClick={close} className="mt-2 w-full text-center text-sm text-navy/60 hover:text-navy">
                Seguir comprando
              </button>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
