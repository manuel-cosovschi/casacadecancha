'use client';

import { useEffect, useState } from 'react';

const KEY = 'cdc_promo_visto';

/** Arma el texto de cuánto falta para que se corte la promo. */
function timeLeft(endsAt: number): string {
  const ms = endsAt - Date.now();
  if (ms <= 0) return '';
  const totalMin = Math.floor(ms / 60000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Cuenta regresiva que se refresca sola y se apaga al vencer. */
function useCountdown(endsAtIso: string) {
  const endsAt = Date.parse(endsAtIso);
  const [left, setLeft] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(endsAt)) return;
    const tick = () => setLeft(timeLeft(endsAt));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [endsAt]);

  return left;
}

/**
 * Franja fija de promo, arriba de todo. Grande y de alto contraste para que sea
 * lo primero que se ve al entrar, pero sin tapar nada ni pedir que la cierren.
 */
export function SaleStrip({
  percent,
  endsAt,
  until,
}: {
  percent: number;
  endsAt: string;
  until: string;
}) {
  const left = useCountdown(endsAt);

  return (
    <div className="relative overflow-hidden bg-red-600 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 px-4 py-4 text-center sm:flex-row sm:justify-center sm:gap-4 sm:py-5">
        <span className="text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">
          {percent}% OFF
        </span>
        <span className="text-sm font-bold uppercase tracking-[0.15em] sm:text-base">
          en toda la tienda
        </span>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide backdrop-blur sm:text-sm">
          {left ? `Termina en ${left}` : `Hasta el ${until}`}
        </span>
      </div>
    </div>
  );
}

/**
 * Popup de bienvenida con la promo. Aparece una vez por visita y se puede
 * cerrar; no vuelve a molestar en la misma sesión.
 */
export function SalePopup({
  percent,
  endsAt,
  until,
}: {
  percent: number;
  endsAt: string;
  until: string;
}) {
  const [open, setOpen] = useState(false);
  const left = useCountdown(endsAt);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${percent}% de descuento en toda la tienda`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-red-600 text-center text-white shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-lg font-bold text-white transition hover:bg-white/25"
        >
          ✕
        </button>

        <div className="px-7 py-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/80">
            Por tiempo limitado
          </p>
          <p className="mt-3 text-7xl font-black leading-none tracking-tight">{percent}%</p>
          <p className="text-3xl font-black uppercase tracking-tight">OFF</p>
          <p className="mt-4 text-base font-semibold">
            En toda la tienda, hasta el {until}.
          </p>
          {left && (
            <p className="mt-2 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold uppercase tracking-wide">
              Termina en {left}
            </p>
          )}
          <button
            type="button"
            onClick={close}
            className="mt-7 w-full rounded-full bg-white py-3.5 text-sm font-black uppercase tracking-wide text-red-600 transition hover:bg-cream"
          >
            Ver productos
          </button>
          <p className="mt-3 text-[11px] text-white/70">
            El descuento ya viene aplicado en los precios.
          </p>
        </div>
      </div>
    </div>
  );
}
