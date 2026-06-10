import Link from 'next/link';
import { PageHeader } from '@/components/admin/ui';
import { ProductForm } from '../ProductForm';
import { getCategories } from '@/lib/admin/data';

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <div>
      <PageHeader
        title="Nuevo producto"
        action={<Link href="/admin/productos" className="text-sm text-navy/60 hover:text-navy">← Volver</Link>}
      />
      <ProductForm categories={categories as any} />
      <p className="mt-4 text-sm text-navy/50">
        Guardá el producto para poder cargar talles y fotos.
      </p>
    </div>
  );
}
