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
  const hasCompare = product.compare_at_price && product.compare_at_price > product.price;
  const off = hasCompare
    ? Math.round((1 - product.price / (product.compare_at_price as number)) * 100)
    : 0;

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-navy/5 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-square overflow-hidden bg-cream-soft">
        {image ? (
          <Image
            src={image.url}
            alt={image.alt_text || product.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="img-zoom object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-navy/20">Sin foto</div>
        )}

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.badge && (
            <span className={cn('badge shadow-sm', classForBadge(product.badge))}>
              {product.badge}
            </span>
          )}
          {off > 0 && (
            <span className="badge bg-red-500 text-white shadow-sm">-{off}%</span>
          )}
        </div>

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-navy/40 backdrop-blur-[1px]">
            <span className="badge bg-white text-navy">Sin stock</span>
          </div>
        )}

        {/* CTA overlay */}
        <div className="absolute inset-x-3 bottom-3 translate-y-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="flex items-center justify-center gap-1.5 rounded-full bg-navy/90 py-2.5 text-xs font-bold uppercase tracking-wide text-cream backdrop-blur">
            Ver producto →
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-bold leading-tight text-navy line-clamp-2">{product.name}</h3>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-navy">{formatPrice(product.price)}</span>
          {hasCompare && (
            <span className="text-sm text-navy/35 line-through">
              {formatPrice(product.compare_at_price as number)}
            </span>
          )}
        </div>

        {transferDiscount > 0 && (
          <p className="mt-1 text-xs font-semibold text-celeste-bright">
            <span className="text-navy/70">{formatPrice(transferPrice)}</span> por transferencia
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
                    'rounded-md border px-1.5 py-0.5 text-[10px] font-bold',
                    ok
                      ? 'border-navy/15 text-navy/70'
                      : 'border-navy/10 text-navy/25 line-through',
                  )}
                >
                  {v.size}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </Link>
  );
}
