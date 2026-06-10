import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/admin/ui';
import { ProductForm } from '../ProductForm';
import { VariantsManager } from '../VariantsManager';
import { ImagesManager } from '../ImagesManager';
import { DeleteProductButton } from '../DeleteProductButton';
import { getAdminProduct, getCategories } from '@/lib/admin/data';

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    getCategories(),
  ]);
  if (!product) notFound();

  const variants = [...(product.variants ?? [])].sort(
    (a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  const images = [...(product.images ?? [])].sort(
    (a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description="Editar producto"
        action={
          <div className="flex items-center gap-3">
            <Link href={`/producto/${product.slug}`} target="_blank" className="text-sm text-navy/60 hover:text-navy">
              Ver en tienda ↗
            </Link>
            <Link href="/admin/productos" className="text-sm text-navy/60 hover:text-navy">
              ← Volver
            </Link>
          </div>
        }
      />

      <ProductForm product={product} categories={categories as any} />
      <VariantsManager productId={product.id} variants={variants} />
      <ImagesManager productId={product.id} images={images} />

      <div className="card border-red-200 p-5">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-red-600">Zona de peligro</h2>
        <p className="mb-3 text-sm text-navy/60">
          Eliminar el producto borra también sus variantes e imágenes. Esta acción no se puede deshacer.
        </p>
        <DeleteProductButton id={product.id} />
      </div>
    </div>
  );
}
