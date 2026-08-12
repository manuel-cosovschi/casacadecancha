import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ProductGrid } from '@/components/store/ProductGrid';
import { CollectionArt } from '@/components/store/CollectionArt';
import { getProductsByCollectionSlug } from '@/lib/queries';
import { getTransferDiscount } from '@/lib/store-helpers';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { collection } = await getProductsByCollectionSlug(slug);
  if (!collection) return { title: 'Colección' };
  return {
    title: collection.name,
    description: collection.description || `Colección ${collection.name}`,
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [{ collection, products }, transferDiscount] = await Promise.all([
    getProductsByCollectionSlug(slug),
    getTransferDiscount(),
  ]);
  // Link viejo de una colección despublicada/inexistente: en vez de 404, al catálogo.
  if (!collection) redirect('/camisetas');
  return (
    <>
      {/* Encabezado con el arte animado de la colección */}
      <section className="relative overflow-hidden">
        <div className="relative h-44 sm:h-56">
          <CollectionArt slug={collection.slug} name={collection.name} />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-navy/10" />
          <div className="container-page relative flex h-full flex-col justify-end pb-6">
            <p className="kicker">Colección</p>
            <h1 className="mt-1 text-3xl font-black uppercase tracking-tight text-cream sm:text-4xl">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="mt-1.5 max-w-xl text-sm text-cream/75">{collection.description}</p>
            )}
          </div>
        </div>
      </section>

      <ProductGrid
        title={`${products.length} producto${products.length === 1 ? '' : 's'}`}
        products={products}
        transferDiscount={transferDiscount}
      />
    </>
  );
}
