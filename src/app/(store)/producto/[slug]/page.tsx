import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ProductGallery } from '@/components/store/ProductGallery';
import { ProductPurchase } from '@/components/store/ProductPurchase';
import { ProductCard } from '@/components/store/ProductCard';
import {
  getProductBySlug,
  getRelatedProducts,
} from '@/lib/queries';
import { getAllSettings } from '@/lib/settings';
import { applyDiscount, formatPrice } from '@/lib/utils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: 'Producto no encontrado' };
  return {
    title: product.seo_title || product.name,
    description:
      product.seo_description ||
      product.short_description ||
      `${product.name} - Casaca de Cancha`,
    openGraph: {
      title: product.seo_title || product.name,
      description: product.short_description || '',
      images: product.images?.[0] ? [{ url: product.images[0].url }] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([
    getProductBySlug(slug),
    getAllSettings(),
  ]);
  // Link viejo de un producto despublicado/inexistente: en vez de 404, al catálogo.
  if (!product) redirect('/camisetas');

  const related = await getRelatedProducts(product.id, product.category_id, 4);
  const transferDiscount = settings.payments_transfer?.active
    ? settings.payments_transfer.discount_percent || 0
    : 0;
  const whatsappNumber = settings.whatsapp?.number || '';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.short_description || product.description || '',
    image: product.images?.map((i) => i.url) ?? [],
    brand: { '@type': 'Brand', name: 'Casaca de Cancha' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'ARS',
      price: product.price,
      availability:
        (product.variants ?? []).some(
          (v) => v.stock_physical - v.stock_reserved > 0,
        )
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      url: `${SITE_URL}/producto/${product.slug}`,
    },
  };

  return (
    <div className="container-page py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-navy/50" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-navy">Inicio</Link>
        <span className="mx-1">/</span>
        <Link href="/camisetas" className="hover:text-navy">Camisetas</Link>
        <span className="mx-1">/</span>
        <span className="text-navy/80">{product.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images ?? []} name={product.name} />

        <div className="lg:sticky lg:top-24 lg:self-start">
          <span className="kicker">Casaca de Cancha</span>
          <h1 className="mt-1 text-3xl font-black uppercase leading-[0.95] sm:text-4xl">
            {product.name}
          </h1>
          {product.short_description && (
            <p className="mt-3 text-navy/65">{product.short_description}</p>
          )}
          <div className="mt-6 rounded-2xl border border-navy/5 bg-white p-5 shadow-card sm:p-6">
            <ProductPurchase
              product={product}
              transferDiscount={transferDiscount}
              whatsappNumber={whatsappNumber}
              siteUrl={SITE_URL}
            />
          </div>
        </div>
      </div>

      {/* Detalle */}
      <div className="mt-12 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {product.description && (
            <section className="mb-8">
              <h2 className="mb-3 text-lg font-bold">Descripción</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-navy/75">
                {product.description}
              </p>
            </section>
          )}
          <section className="grid gap-4 sm:grid-cols-2">
            {product.material && <Spec label="Material" value={product.material} />}
            {product.fabric && <Spec label="Tela" value={product.fabric} />}
            {product.care && <Spec label="Cuidados" value={product.care} />}
            <Spec
              label="Envíos"
              value={settings.shipping?.text || 'Envíos a todo el país.'}
            />
            <Spec
              label="Cambios"
              value="Cambios según política vigente. Consultanos por WhatsApp."
            />
            {transferDiscount > 0 && product.transfer_discount !== false && (
              <Spec
                label="Transferencia"
                value={`Pagando por transferencia: ${formatPrice(
                  applyDiscount(product.price, transferDiscount),
                )} (${transferDiscount}% OFF)`}
              />
            )}
          </section>
        </div>
      </div>

      {/* Relacionados */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 text-xl font-extrabold uppercase">También te puede gustar</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} transferDiscount={transferDiscount} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-navy/50">{label}</p>
      <p className="mt-1 text-sm text-navy/80">{value}</p>
    </div>
  );
}
