import type { Metadata } from 'next';
import { ProductGrid } from '@/components/store/ProductGrid';
import { getProductsByCategorySlug, getActiveProducts } from '@/lib/queries';
import { getTransferDiscount } from '@/lib/store-helpers';

export const metadata: Metadata = {
  title: 'Camisetas de fútbol',
  description:
    'Camisetas de Argentina y más para vivir el Mundial. Envíos a todo el país desde Mar del Plata.',
};

export default async function CamisetasPage() {
  const [byCat, all, transferDiscount] = await Promise.all([
    getProductsByCategorySlug('camisetas'),
    getActiveProducts(48),
    getTransferDiscount(),
  ]);
  const products = byCat.length > 0 ? byCat : all;
  return (
    <ProductGrid
      title="Camisetas"
      description="Camisetas para vivir cada partido con tus colores."
      products={products}
      transferDiscount={transferDiscount}
    />
  );
}
