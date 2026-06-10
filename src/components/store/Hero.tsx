import Image from 'next/image';
import Link from 'next/link';
import type { HeroSettings, WhatsAppSettings } from '@/lib/types';
import { cn, whatsappLink } from '@/lib/utils';

export function Hero({
  data,
  whatsapp,
}: {
  data: HeroSettings;
  whatsapp: WhatsAppSettings;
}) {
  if (!data?.active) return null;
  const alignCenter = data.align === 'center';

  return (
    <section className="relative overflow-hidden bg-navy text-cream">
      <div className="pitch-pattern absolute inset-0 opacity-60" aria-hidden="true" />
      {/* Imagen de fondo opcional */}
      {data.image_desktop && (
        <div className="absolute inset-0">
          <Image
            src={data.image_desktop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="hidden object-cover opacity-40 sm:block"
          />
          {data.image_mobile && (
            <Image
              src={data.image_mobile}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-40 sm:hidden"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/80 to-navy/30" />
        </div>
      )}

      <div
        className={cn(
          'container-page relative flex min-h-[68vh] flex-col justify-center py-16 sm:min-h-[72vh]',
          alignCenter && 'items-center text-center',
        )}
      >
        <div className={cn('max-w-2xl animate-fade-in', alignCenter && 'mx-auto')}>
          <span className="mb-4 inline-block rounded-full border border-celeste/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-celeste">
            Mundial 2026
          </span>
          <h1 className="text-4xl font-extrabold uppercase leading-[0.95] sm:text-6xl lg:text-7xl">
            {data.title}
          </h1>
          <p className="mt-5 max-w-lg text-base text-cream/80 sm:text-lg">
            {data.subtitle}
          </p>
          <div
            className={cn(
              'mt-8 flex flex-col gap-3 sm:flex-row',
              alignCenter && 'justify-center',
            )}
          >
            <Link href={data.cta_link || '/camisetas'} className="btn-celeste text-base">
              {data.cta_text}
            </Link>
            {data.secondary_text && (
              <a
                href={whatsappLink(whatsapp.number, whatsapp.default_message)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline border-cream text-cream hover:bg-cream hover:text-navy"
              >
                {data.secondary_text}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
