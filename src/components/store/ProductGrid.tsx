import { ProductCard } from '@/components/store/ProductCard';
import type { Product } from '@/lib/types';

export function ProductGrid({
  title,
  description,
  products,
  transferDiscount,
}: {
  title: string;
  description?: string | null;
  products: Product[];
  transferDiscount: number;
}) {
  return (
    <div className="container-page py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold uppercase text-navy">{title}</h1>
        {description && <p className="mt-2 text-navy/70">{description}</p>}
      </header>
      {products.length === 0 ? (
        <div className="card p-10 text-center text-navy/60">
          Pronto vas a encontrar productos en esta sección. Consultanos por WhatsApp.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} transferDiscount={transferDiscount} />
          ))}
        </div>
      )}
    </div>
  );
}
