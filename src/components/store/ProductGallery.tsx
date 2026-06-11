'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import type { ProductImage } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ProductGallery({
  images,
  name,
}: {
  images: ProductImage[];
  name: string;
}) {
  const [active, setActive] = useState(0);
  const touchX = useRef<number | null>(null);
  const count = images.length;

  function go(i: number) {
    setActive(Math.max(0, Math.min(count - 1, i)));
  }

  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(delta) > 40) go(active + (delta < 0 ? 1 : -1));
    touchX.current = null;
  }

  if (count === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-navy/5 text-navy/30">
        Sin foto
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Carrusel */}
      <div
        className="group relative aspect-square overflow-hidden rounded-2xl bg-cream-soft"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex h-full w-full transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${active * 100}%)` }}
        >
          {images.map((img, i) => (
            <div key={img.id} className="relative h-full w-full shrink-0">
              <Image
                src={img.url}
                alt={img.alt_text || `${name} ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            {/* Flechas */}
            <button
              type="button"
              onClick={() => go(active - 1)}
              disabled={active === 0}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-navy shadow-soft backdrop-blur transition hover:bg-white disabled:opacity-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <button
              type="button"
              onClick={() => go(active + 1)}
              disabled={active === count - 1}
              aria-label="Siguiente"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-navy shadow-soft backdrop-blur transition hover:bg-white disabled:opacity-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>

            {/* Puntos */}
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Ir a la imagen ${i + 1}`}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    i === active ? 'w-5 bg-navy' : 'w-2 bg-navy/30',
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => go(i)}
              className={cn(
                'relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-navy/5 transition',
                i === active ? 'border-navy' : 'border-transparent opacity-70 hover:opacity-100',
              )}
              aria-label={`Ver imagen ${i + 1}`}
            >
              <Image src={img.url} alt={img.alt_text || `${name} ${i + 1}`} fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
