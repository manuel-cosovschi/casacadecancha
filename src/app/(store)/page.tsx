import Image from 'next/image';
import Link from 'next/link';
import { Hero } from '@/components/store/Hero';
import { ProductCard } from '@/components/store/ProductCard';
import { ProductPurchase } from '@/components/store/ProductPurchase';
import { FaqAccordion } from '@/components/store/FaqAccordion';
import { getAllSettings } from '@/lib/settings';
import {
  getActiveCollections,
  getActiveProducts,
  getFAQs,
  getFeaturedProduct,
} from '@/lib/queries';
import { formatPrice } from '@/lib/utils';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default async function HomePage() {
  const [settings, products, collections, featured, faqs] = await Promise.all([
    getAllSettings(),
    getActiveProducts(8),
    getActiveCollections(),
    getFeaturedProduct(),
    getFAQs(),
  ]);

  const transferDiscount = settings.payments_transfer?.active
    ? settings.payments_transfer.discount_percent || 0
    : 0;
  const whatsappNumber = settings.whatsapp?.number || '';

  return (
    <>
      <Hero data={settings.hero} whatsapp={settings.whatsapp} />

      {/* Trust strip */}
      <section className="border-b border-navy/10 bg-white">
        <div className="container-page grid grid-cols-2 gap-4 py-6 sm:grid-cols-4">
          {(settings.trust_strip?.items || []).map((item: { title: string }, i: number) => (
            <div key={i} className="flex items-center gap-3 text-sm font-medium text-navy/80">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-celeste/25 text-navy">
                <TrustIcon index={i} />
              </span>
              {item.title}
            </div>
          ))}
        </div>
      </section>

      {/* Producto estrella */}
      {featured && (
        <section className="bg-cream py-14">
          <div className="container-page grid gap-8 lg:grid-cols-2">
            <div className="relative aspect-square overflow-hidden rounded-3xl bg-navy/5">
              {featured.images?.[0] ? (
                <Image
                  src={featured.images[0].url}
                  alt={featured.images[0].alt_text || featured.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : null}
              {featured.badge && (
                <span className="badge absolute left-4 top-4 bg-gold text-navy">
                  {featured.badge}
                </span>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <span className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
                Producto destacado
              </span>
              <h2 className="text-3xl font-extrabold uppercase leading-tight">
                {featured.name}
              </h2>
              {featured.short_description && (
                <p className="mt-2 text-navy/70">{featured.short_description}</p>
              )}
              <div className="mt-6">
                <ProductPurchase
                  product={featured}
                  transferDiscount={transferDiscount}
                  whatsappNumber={whatsappNumber}
                  siteUrl={SITE_URL}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Colecciones destacadas */}
      {collections.length > 0 && (
        <section className="py-12">
          <div className="container-page">
            <SectionTitle kicker="Explorá" title="Colecciones" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {collections.map((c) => (
                <Link
                  key={c.id}
                  href={`/coleccion/${c.slug}`}
                  className="group relative flex aspect-[4/5] items-end overflow-hidden rounded-2xl bg-navy"
                >
                  {c.image_url && (
                    <Image
                      src={c.image_url}
                      alt={c.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover opacity-70 transition group-hover:scale-105 group-hover:opacity-90"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/90 to-transparent" />
                  <span className="relative p-4 text-sm font-bold uppercase tracking-wide text-cream">
                    {c.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Grilla de productos */}
      {products.length > 0 && (
        <section className="py-12">
          <div className="container-page">
            <SectionTitle kicker="Lo nuevo" title="Camisetas y más" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} transferDiscount={transferDiscount} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bloque emocional del Mundial */}
      {settings.mundial_block?.active && (
        <section className="relative overflow-hidden bg-navy py-20 text-cream">
          <div className="pitch-pattern absolute inset-0 opacity-50" aria-hidden="true" />
          {settings.mundial_block.image_url && (
            <Image
              src={settings.mundial_block.image_url}
              alt=""
              fill
              sizes="100vw"
              className="absolute inset-0 object-cover opacity-30"
            />
          )}
          <div className="container-page relative text-center">
            <h2 className="mx-auto max-w-3xl text-3xl font-extrabold uppercase leading-tight sm:text-5xl">
              {settings.mundial_block.title}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-cream/80">
              {settings.mundial_block.subtitle}
            </p>
            <Link href="/camisetas" className="btn-celeste mt-8">
              Ver camisetas
            </Link>
          </div>
        </section>
      )}

      {/* Cómo comprar */}
      <section className="py-14">
        <div className="container-page">
          <SectionTitle kicker="Simple" title="Cómo comprar" center />
          <ol className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              'Elegí tu modelo',
              'Seleccioná el talle',
              'Agregalo al carrito',
              'Completá tus datos',
              'Elegí cómo pagar',
              'Coordinamos el envío',
            ].map((step, i) => (
              <li key={i} className="card flex flex-col items-center gap-2 p-4 text-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-sm font-bold text-cream">
                  {i + 1}
                </span>
                <span className="text-xs font-medium text-navy/80">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="bg-white py-14">
          <div className="container-page">
            <SectionTitle kicker="Dudas" title="Preguntas frecuentes" center />
            <FaqAccordion faqs={faqs} />
          </div>
        </section>
      )}
    </>
  );
}

function SectionTitle({
  kicker,
  title,
  center,
}: {
  kicker: string;
  title: string;
  center?: boolean;
}) {
  return (
    <div className={`mb-6 ${center ? 'text-center' : ''}`}>
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
        {kicker}
      </span>
      <h2 className="text-2xl font-extrabold uppercase text-navy sm:text-3xl">{title}</h2>
    </div>
  );
}

function TrustIcon({ index }: { index: number }) {
  const icons = [
    <path key="t" d="M3 7h11v8H3zM14 10h4l3 3v2h-7" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    <path key="w" d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3z" stroke="currentColor" strokeWidth="1.6" fill="none" />,
    <path key="d" d="M9 9h.01M15 15h.01M16 8l-8 8M5 12a7 7 0 0 1 14 0 7 7 0 0 1-14 0z" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />,
    <path key="r" d="M4 12a8 8 0 0 1 14-5m2-2v4h-4M20 12a8 8 0 0 1-14 5m-2 2v-4h4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  ];
  return (
    <svg width="20" height="20" viewBox="0 0 24 24">
      {icons[index % icons.length]}
    </svg>
  );
}
