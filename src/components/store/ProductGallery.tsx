'use client';

import Image from 'next/image';
import { useState } from 'react';
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
  const current = images[active];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-navy/5">
        {current ? (
          <Image
            src={current.url}
            alt={current.alt_text || name}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-navy/30">
            Sin foto
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              className={cn(
                'relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-navy/5',
                i === active ? 'border-navy' : 'border-transparent',
              )}
              aria-label={`Ver imagen ${i + 1}`}
            >
              <Image
                src={img.url}
                alt={img.alt_text || `${name} ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
