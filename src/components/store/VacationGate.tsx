'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const KEY = 'cdc_vacaciones_visto';

/**
 * Cartel de vacaciones con El Cabra, la mascota de Casaca de Cancha.
 * Aparece al entrar, se puede cerrar para seguir mirando el catálogo,
 * y vuelve a aparecer en la próxima visita (se guarda por sesión).
 */
export function VacationGate({
  title,
  subtitle,
  note,
  whatsapp,
  mascot,
}: {
  title: string;
  subtitle: string;
  note: string;
  whatsapp: string;
  mascot: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let visto = false;
    try {
      visto = sessionStorage.getItem(KEY) === '1';
    } catch {
      /* ignore */
    }
    if (!visto) setOpen(true);
  }, []);

  function close() {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/80 p-4 backdrop-blur-sm">
      <div className="cc-pop-in relative w-full max-w-2xl overflow-hidden rounded-3xl border border-celeste/25 bg-gradient-to-br from-[#13315f] via-[#0B1F3A] to-[#08152a] shadow-lift">
        {/* Fondo: franjas de marca + resplandor */}
        <div className="brand-stripes pointer-events-none absolute inset-0 opacity-50" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(60% 50% at 78% 15%, rgba(140,200,232,.28), transparent 62%), radial-gradient(55% 45% at 12% 88%, rgba(199,167,107,.18), transparent 60%)',
          }}
        />

        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-cream transition hover:bg-white/20"
        >
          ✕
        </button>

        <div className="relative flex flex-col items-center gap-2 p-6 sm:flex-row sm:items-end sm:gap-6 sm:p-8">
          {/* El Cabra, flotando */}
          <div className="cc-mascot relative h-52 w-28 shrink-0 sm:h-72 sm:w-40">
            <Image
              src={mascot}
              alt="El Cabra, la mascota de Casaca de Cancha"
              fill
              sizes="160px"
              className="object-contain object-bottom drop-shadow-[0_18px_28px_rgba(0,0,0,.45)]"
              priority
            />
            {/* Brillo que cruza los anteojos */}
            <span className="cc-shine pointer-events-none absolute left-0 top-[18%] h-6 w-full" />
          </div>

          <div className="pb-1 text-center sm:text-left">
            <span className="badge bg-celeste text-navy">🌴 De vacaciones</span>
            <h2 className="mt-2.5 text-2xl font-black uppercase leading-[0.95] text-cream sm:text-4xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-lg font-bold text-celeste sm:text-xl">{subtitle}</p>
            )}
            {note && <p className="mt-2.5 text-sm text-cream/70">{note}</p>}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button onClick={close} className="btn-celeste !py-2.5">
                Ver el catálogo igual
              </button>
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

/** Barra fija que queda tras cerrar el cartel. */
export function VacationBar({ subtitle }: { subtitle: string }) {
  return (
    <div className="sticky top-0 z-30 bg-gold text-navy">
      <div className="container-page flex items-center justify-center gap-2 py-2 text-center text-xs font-bold uppercase tracking-wide sm:text-sm">
        <span>🌴 Estamos de vacaciones — los pedidos están pausados.</span>
        {subtitle && <span className="hidden sm:inline">{subtitle}</span>}
      </div>
    </div>
  );
}
