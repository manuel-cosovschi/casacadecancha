import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductGrid } from '@/components/store/ProductGrid';
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
  if (!collection) notFound();
  return (
    <ProductGrid
      title={collection.name}
      description={collection.description}
      products={products}
      transferDiscount={transferDiscount}
    />
  );
}
