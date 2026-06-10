import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import {
  applyDiscount,
  availableStock,
  classForBadge,
  cn,
  formatPrice,
} from '@/lib/utils';

export function ProductCard({
  product,
  transferDiscount,
}: {
  product: Product;
  transferDiscount: number;
}) {
  const image = product.images?.[0];
  const sizes = (product.variants ?? []).filter((v) => v.active);
  const inStockSizes = sizes.filter((v) => availableStock(v) > 0);
  const soldOut = inStockSizes.length === 0;
  const transferPrice = applyDiscount(product.price, transferDiscount);

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-square overflow-hidden bg-navy/5">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt_text || product.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-navy/30">
            Sin foto
          </div>
        )}
        {product.badge && (
          <span className={cn('badge absolute left-3 top-3', classForBadge(product.badge))}>
            {product.badge}
          </span>
        )}
        {soldOut && (
          <span className="badge absolute right-3 top-3 bg-navy/80 text-white">
            Sin stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-semibold leading-tight text-navy line-clamp-2">
          {product.name}
        </h3>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-navy">
            {formatPrice(product.price)}
          </span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-sm text-navy/40 line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>

        {transferDiscount > 0 && (
          <p className="text-xs font-medium text-celeste-soft text-navy/70">
            {formatPrice(transferPrice)} por transferencia
          </p>
        )}

        {sizes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {sizes.map((v) => {
              const ok = availableStock(v) > 0;
              return (
                <span
                  key={v.id}
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-[10px] font-semibold',
                    ok
                      ? 'border-navy/20 text-navy/70'
                      : 'border-navy/10 text-navy/25 line-through',
                  )}
                >
                  {v.size}
                </span>
              );
            })}
          </div>
        )}

        <span className="mt-4 text-sm font-semibold text-navy underline-offset-4 group-hover:underline">
          Ver producto →
        </span>
      </div>
    </Link>
  );
}
