import Image from 'next/image';
import Link from 'next/link';
import { MASCOT_URL } from '@/lib/brand';

/** Bloque que reemplaza al checkout / encargos mientras la tienda está de vacaciones. */
export function VacationNotice({
  title,
  subtitle,
  whatsapp,
}: {
  title: string;
  subtitle: string;
  whatsapp?: string;
}) {
  return (
    <div className="container-page py-12">
      <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-celeste/25 bg-gradient-to-br from-[#13315f] via-[#0B1F3A] to-[#08152a] p-6 shadow-lift sm:p-8">
        <div className="brand-stripes pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:text-left">
          <div className="cc-mascot relative h-44 w-24 shrink-0 sm:h-56 sm:w-32">
            <Image
              src={MASCOT_URL}
              alt="El Cabra, la mascota de Casaca de Cancha"
              fill
              sizes="128px"
              className="object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,.45)]"
            />
          </div>
          <div className="pb-1">
            <span className="badge bg-celeste text-navy">🌴 De vacaciones</span>
            <h1 className="mt-2 text-2xl font-black uppercase leading-tight text-cream sm:text-3xl">
              {title}
            </h1>
            {subtitle && <p className="mt-1.5 text-lg font-bold text-celeste">{subtitle}</p>}
            <p className="mt-2.5 text-sm text-cream/70">
              Los pedidos por la web están pausados hasta que volvamos. Podés seguir mirando el
              catálogo y dejarnos tu consulta.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link href="/camisetas" className="btn-celeste !py-2.5">
                Ver el catálogo
              </Link>
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                    'Hola! Vi que están de vacaciones. Quería consultar por una camiseta para cuando vuelvan.',
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-wsp !py-2.5"
                >
                  Dejar consulta
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
