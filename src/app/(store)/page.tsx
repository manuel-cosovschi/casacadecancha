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
      <section className="relative z-10 -mt-2 border-b border-navy/5 bg-cream">
        <div className="container-page grid grid-cols-2 gap-3 py-6 sm:grid-cols-4">
          {(settings.trust_strip?.items || []).map((item: { title: string }, i: number) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-navy/5 bg-white px-4 py-3 text-sm font-semibold text-navy/80 shadow-card"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-celeste/20 text-navy">
                <TrustIcon index={i} />
              </span>
              {item.title}
            </div>
          ))}
        </div>
      </section>

      {/* Producto estrella */}
      {featured && (
        <section className="py-16 sm:py-20">
          <div className="container-page grid items-center gap-10 lg:grid-cols-2">
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2.5rem] bg-celeste/15 blur-2xl" />
              <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-navy/5 bg-cream-soft shadow-lift">
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
                  <span className="badge absolute left-4 top-4 bg-gold text-navy shadow">
                    {featured.badge}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <span className="kicker">Producto destacado</span>
              <h2 className="mt-2 text-3xl font-black uppercase leading-[0.95] sm:text-5xl">
                {featured.name}
              </h2>
              {featured.short_description && (
                <p className="mt-3 text-navy/65">{featured.short_description}</p>
              )}
              <div className="mt-7 rounded-2xl border border-navy/5 bg-white p-5 shadow-card sm:p-6">
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

      {/* Colecciones */}
      {collections.length > 0 && (
        <section className="py-12">
          <div className="container-page">
            <SectionTitle kicker="Explorá" title="Colecciones" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {collections.map((c) => (
                <Link
                  key={c.id}
                  href={`/coleccion/${c.slug}`}
                  className="group relative flex aspect-[4/5] items-end overflow-hidden rounded-2xl gradient-navy"
                >
                  {c.image_url && (
                    <Image
                      src={c.image_url}
                      alt={c.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="img-zoom object-cover opacity-60 group-hover:opacity-80"
                    />
                  )}
                  <div className="brand-stripes absolute inset-0 opacity-40" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/30 to-transparent" />
                  <div className="relative p-4">
                    <span className="text-base font-extrabold uppercase tracking-wide text-cream">
                      {c.name}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-celeste opacity-0 transition group-hover:opacity-100">
                      Ver colección →
                    </span>
                  </div>
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
            <SectionTitle kicker="Lo nuevo" title="Camisetas y más" cta={{ label: 'Ver todo', href: '/camisetas' }} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} transferDiscount={transferDiscount} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bloque emocional del Mundial */}
      {settings.mundial_block?.active && (
        <section className="relative my-12 overflow-hidden">
          <div className="container-page">
            <div className="gradient-hero brand-stripes relative overflow-hidden rounded-[2.5rem] px-6 py-16 text-center text-cream sm:py-20">
              <div className="pitch-pattern absolute inset-0 opacity-60" aria-hidden />
              {settings.mundial_block.image_url && (
                <Image
                  src={settings.mundial_block.image_url}
                  alt=""
                  fill
                  sizes="100vw"
                  className="absolute inset-0 object-cover opacity-25"
                />
              )}
              <div className="relative">
                <span className="kicker">Viví el Mundial</span>
                <h2 className="mx-auto mt-3 max-w-3xl text-balance text-3xl font-black uppercase leading-[0.95] sm:text-5xl">
                  {settings.mundial_block.title}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-cream/75">
                  {settings.mundial_block.subtitle}
                </p>
                <Link href="/camisetas" className="btn-celeste mt-8">
                  Ver camisetas →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Cómo comprar */}
      <section className="py-14">
        <div className="container-page">
          <SectionTitle kicker="Súper simple" title="Cómo comprar" center />
          <ol className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              'Elegí tu modelo',
              'Seleccioná el talle',
              'Agregalo al carrito',
              'Completá tus datos',
              'Elegí cómo pagar',
              'Coordinamos la entrega',
            ].map((step, i) => (
              <li
                key={i}
                className="group relative flex flex-col items-center gap-2.5 rounded-2xl border border-navy/5 bg-white p-4 text-center shadow-card transition hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-base font-black text-cream transition group-hover:bg-celeste group-hover:text-navy">
                  {i + 1}
                </span>
                <span className="text-xs font-semibold text-navy/80">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="py-14">
          <div className="container-page">
            <SectionTitle kicker="Dudas frecuentes" title="Preguntas frecuentes" center />
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
  cta,
}: {
  kicker: string;
  title: string;
  center?: boolean;
  cta?: { label: string; href: string };
}) {
  return (
    <div
      className={`mb-7 flex flex-wrap items-end gap-3 ${
        center ? 'flex-col justify-center text-center' : 'justify-between'
      }`}
    >
      <div>
        <span className="kicker">{kicker}</span>
        <h2 className="mt-1 text-3xl font-black uppercase tracking-tight text-navy sm:text-4xl">
          {title}
        </h2>
      </div>
      {cta && (
        <Link
          href={cta.href}
          className="text-sm font-bold text-navy/70 underline-offset-4 transition hover:text-navy hover:underline"
        >
          {cta.label} →
        </Link>
      )}
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
