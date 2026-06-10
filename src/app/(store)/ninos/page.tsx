import type { Metadata } from 'next';
import { ProductGrid } from '@/components/store/ProductGrid';
import { getProductsByCategorySlug } from '@/lib/queries';
import { getTransferDiscount } from '@/lib/store-helpers';

export const metadata: Metadata = {
  title: 'Indumentaria para niños',
  description: 'Camisetas y buzos de fútbol para los más chicos.',
};

export default async function NinosPage() {
  const [products, transferDiscount] = await Promise.all([
    getProductsByCategorySlug('ninos'),
    getTransferDiscount(),
  ]);
  return (
    <ProductGrid
      title="Niños"
      description="Para que los más chicos también vivan el fútbol."
      products={products}
      transferDiscount={transferDiscount}
    />
  );
}
