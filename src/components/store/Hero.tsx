import Image from 'next/image';
import Link from 'next/link';
import type { HeroSettings, WhatsAppSettings } from '@/lib/types';
import { cn, whatsappLink } from '@/lib/utils';
import { Isotipo } from '@/components/brand/Logo';

export function Hero({
  data,
  whatsapp,
}: {
  data: HeroSettings;
  whatsapp: WhatsAppSettings;
}) {
  if (!data?.active) return null;
  const alignCenter = data.align === 'center';
  const hasImage = Boolean(data.image_desktop);

  return (
    <section className="gradient-hero brand-stripes relative overflow-hidden text-cream">
      <div className="pitch-pattern absolute inset-0 opacity-70" aria-hidden="true" />

      <div
        className={cn(
          'container-page relative grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-2 lg:py-24',
          alignCenter && 'lg:grid-cols-1',
        )}
      >
        {/* Texto */}
        <div className={cn('max-w-2xl animate-fade-up', alignCenter && 'mx-auto text-center')}>
          <span className="chip mb-5 border-celeste/30 bg-celeste/10 text-celeste">
            <span className="h-1.5 w-1.5 rounded-full bg-celeste" />
            Mundial 2026 · Edición limitada
          </span>
          <h1 className="text-balance text-5xl font-black uppercase leading-[0.9] sm:text-7xl lg:text-[5.5rem]">
            {data.title}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-cream/75 sm:text-lg">
            {data.subtitle}
          </p>

          <div className={cn('mt-9 flex flex-col gap-3 sm:flex-row', alignCenter && 'justify-center')}>
            <Link href={data.cta_link || '/camisetas'} className="btn-celeste text-base">
              {data.cta_text}
              <span aria-hidden>→</span>
            </Link>
            {data.secondary_text && (
              <a
                href={whatsappLink(whatsapp.number, whatsapp.default_message)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline border-cream/25 bg-white/5 text-cream hover:bg-cream hover:text-navy"
              >
                {data.secondary_text}
              </a>
            )}
          </div>

          {/* Trust chips */}
          <div className={cn('mt-9 flex flex-wrap gap-2.5', alignCenter && 'justify-center')}>
            {['Envíos a todo el país', 'Gratis en Mar del Plata', '10% OFF por transferencia'].map(
              (t) => (
                <span key={t} className="chip border-white/10 bg-white/5 text-cream/80">
                  {t}
                </span>
              ),
            )}
          </div>
        </div>

        {/* Visual */}
        {!alignCenter && (
          <div className="relative hidden lg:block">
            {hasImage ? (
              <div className="relative animate-float">
                <div className="absolute -inset-6 rounded-[2.5rem] bg-celeste/20 blur-3xl" />
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/15 shadow-lift">
                  <Image
                    src={data.image_desktop}
                    alt={data.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 0px, 45vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy/40 to-transparent" />
                </div>
              </div>
            ) : (
              <DecorativePanel />
            )}
          </div>
        )}
      </div>

      {/* Fade inferior hacia el contenido */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-cream to-transparent" />
    </section>
  );
}

/** Panel decorativo de marca cuando no hay imagen de hero. */
function DecorativePanel() {
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-md animate-float">
      <div className="absolute -inset-8 rounded-[3rem] bg-celeste/15 blur-3xl" />
      <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-white/15 bg-white/5 backdrop-blur">
        <div className="absolute inset-0 opacity-30">
          <div className="brand-stripes h-full w-full" />
        </div>
        <Isotipo theme="dark" size={96} />
        <div className="relative mt-6 text-center">
          <p className="font-display text-8xl font-black leading-none text-celeste/90">10</p>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.3em] text-cream/70">
            Casaca de Cancha
          </p>
        </div>
      </div>
    </div>
  );
}
