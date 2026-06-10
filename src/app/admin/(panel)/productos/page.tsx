import Link from 'next/link';
import Image from 'next/image';
import { PageHeader, EmptyState } from '@/components/admin/ui';
import { getAdminProducts } from '@/lib/admin/data';
import { availableStock, formatPrice } from '@/lib/utils';

export default async function ProductsPage() {
  const products = await getAdminProducts();

  return (
    <div>
      <PageHeader
        title="Productos"
        description={`${products.length} productos`}
        action={
          <Link href="/admin/productos/nuevo" className="btn-primary">
            + Nuevo producto
          </Link>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          message="Todavía no cargaste productos."
          cta={{ label: 'Crear el primero', href: '/admin/productos/nuevo' }}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-navy/50">
                <th className="p-3">Producto</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Estado</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => {
                const stock = (p.variants ?? []).reduce(
                  (acc: number, v: any) => acc + availableStock(v),
                  0,
                );
                const img = p.images?.find((i: any) => i.is_primary) ?? p.images?.[0];
                return (
                  <tr key={p.id} className="border-b border-navy/5">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded bg-navy/5">
                          {img && (
                            <Image src={img.url} alt={p.name} fill sizes="40px" className="object-cover" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-navy">{p.name}</p>
                          <p className="text-xs text-navy/50">{p.categories?.name || 'Sin categoría'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-medium">{formatPrice(p.price)}</td>
                    <td className="p-3">
                      <span className={stock <= 0 ? 'text-red-600' : stock < 5 ? 'text-amber-600' : ''}>
                        {stock} u.
                      </span>
                    </td>
                    <td className="p-3">
                      {p.active ? (
                        <span className="badge bg-green-100 text-green-800">Activo</span>
                      ) : (
                        <span className="badge bg-navy/10 text-navy/60">Inactivo</span>
                      )}
                      {p.featured && <span className="badge ml-1 bg-gold/30 text-navy">Destacado</span>}
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/admin/productos/${p.id}`} className="font-semibold text-navy hover:underline">
                        Editar
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
