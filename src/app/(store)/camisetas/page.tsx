import type { Metadata } from 'next';
import { ProductGrid } from '@/components/store/ProductGrid';
import { SmartSearch } from '@/components/store/SmartSearch';
import { getProductsByCategorySlug, getActiveProducts } from '@/lib/queries';
import { getTransferDiscount } from '@/lib/store-helpers';
import { vaEnLaVidriera } from '@/lib/utils';

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
  // El filtro va acá y no adentro de `getActiveProducts`, que devuelve el
  // catálogo entero para el sitemap, el buscador y Goat. Este `all` es la red
  // por si algún producto quedó sin categoría cargada, y también tiene que
  // dejar afuera lo agotado.
  const products = (byCat.length > 0 ? byCat : all).filter(vaEnLaVidriera);
  return (
    <>
      <div className="container-page pt-8">
        <SmartSearch />
      </div>
      <ProductGrid
        title="Camisetas"
        description="Camisetas para vivir cada partido con tus colores."
        products={products}
        transferDiscount={transferDiscount}
      />
    </>
  );
}
