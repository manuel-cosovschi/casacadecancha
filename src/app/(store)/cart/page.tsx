'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/components/cart/CartProvider';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-3xl font-extrabold uppercase">Tu carrito</h1>

      {items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-navy/60">Tu carrito está vacío.</p>
          <Link href="/camisetas" className="btn-celeste mt-4 inline-flex">
            Ver camisetas
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ul className="space-y-3">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-4 card p-4">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-navy/5">
                    {item.image && (
                      <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-navy/60">Talle {item.size}</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.variantId)}
                        className="text-sm text-navy/40 hover:text-red-500"
                      >
                        Eliminar
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-navy/15">
                        <button className="px-3 py-1.5" onClick={() => updateQuantity(item.variantId, item.quantity - 1)}>−</button>
                        <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button className="px-3 py-1.5" onClick={() => updateQuantity(item.variantId, item.quantity + 1)}>+</button>
                      </div>
                      <span className="font-bold">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <aside className="card h-fit p-5">
            <h2 className="mb-4 text-lg font-bold">Resumen</h2>
            <div className="flex justify-between border-b border-navy/10 pb-3 text-sm">
              <span className="text-navy/70">Subtotal</span>
              <span className="font-semibold">{formatPrice(subtotal)}</span>
            </div>
            <p className="mt-3 text-xs text-navy/60">
              El costo de envío y el descuento por transferencia se calculan en el checkout.
            </p>
            <Link href="/checkout" className="btn-primary mt-4 w-full">
              Finalizar compra
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
