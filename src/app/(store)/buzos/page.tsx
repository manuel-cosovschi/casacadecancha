import type { Metadata } from 'next';
import { ProductGrid } from '@/components/store/ProductGrid';
import { getProductsByCategorySlug } from '@/lib/queries';
import { getTransferDiscount } from '@/lib/store-helpers';

export const metadata: Metadata = {
  title: 'Buzos de fútbol',
  description: 'Buzos y abrigos futboleros. Envíos a todo el país.',
};

export default async function BuzosPage() {
  const [products, transferDiscount] = await Promise.all([
    getProductsByCategorySlug('buzos'),
    getTransferDiscount(),
  ]);
  return (
    <ProductGrid
      title="Buzos"
      description="Abrigate con tus colores."
      products={products}
      transferDiscount={transferDiscount}
    />
  );
}
