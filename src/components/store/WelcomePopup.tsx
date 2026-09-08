'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { subscribeWelcome } from '@/app/(store)/welcome-actions';

/**
 * Popup de captación: pide nombre y mail a cambio de un 10% en la primera
 * compra.
 *
 * Aparece en CADA visita, no una sola vez, porque así se pidió. Lo único que
 * lo silencia es haberse suscrito: guardamos esa marca en localStorage para no
 * volver a pedirle el mail a quien ya lo dejó. Sin eso el popup le pediría los
 * datos otra vez a alguien que ya los dio, que es la forma más rápida de que
 * la gente deje de comprar.
 */
const KEY = 'cdc_welcome_ok';

/**
 * Cuánto esperamos antes de mostrarlo. Saltar encima del visitante apenas
 * entra es la forma más rápida de que cierre la pestaña: primero que mire las
 * camisetas, y recién ahí le ofrecemos el descuento.
 */
const DELAY_MS = 5000;

/**
 * Dónde no aparece nunca. Con la espera de 5 segundos el popup ya no cae al
 * entrar sino en el medio de lo que la persona esté haciendo, y taparle el
 * formulario de compra a alguien que está tipeando su dirección es perder la
 * venta para ganar un mail.
 */
const SILENT_PATHS = ['/checkout', '/cart', '/pedido', '/cobrar'];

export function WelcomePopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = open && !SILENT_PATHS.some((p) => pathname?.startsWith(p));

  // El reloj arranca una sola vez, en la primera carga, y no se reinicia al
  // navegar: son 5 segundos en la tienda, no 5 segundos por página. Si no,
  // quien va clickeando de una camiseta a otra no lo ve nunca.
  useEffect(() => {
    let already = false;
    try {
      already = localStorage.getItem(KEY) === '1';
    } catch {
      /* ignore */
    }
    if (already) return;
    const t = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [visible]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    setSending(true);
    try {
      const res = await subscribeWelcome(name, email);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      try {
        localStorage.setItem(KEY, '1');
      } catch {
        /* ignore */
      }
      setDone(res.message);
    } catch {
      setError('No se pudo enviar. Probá de nuevo en un momento.');
    } finally {
      setSending(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="10% de descuento en tu primera compra"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/70 p-4 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-navy/10 text-lg font-bold text-navy transition hover:bg-navy/20"
        >
          ✕
        </button>

        {done ? (
          <div className="px-7 py-12 text-center">
            <p className="text-5xl">✓</p>
            <h2 className="mt-4 text-2xl font-black uppercase text-navy">Listo</h2>
            <p className="mt-2 text-sm text-navy/70">{done}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-7 w-full rounded-full bg-navy py-3.5 text-sm font-black uppercase tracking-wide text-cream transition hover:bg-navy/90"
            >
              Ver camisetas
            </button>
          </div>
        ) : (
          <>
            <div className="gradient-navy px-7 py-8 text-center text-cream">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-cream/70">
                Bienvenido
              </p>
              <p className="mt-3 text-6xl font-black leading-none">10%</p>
              <p className="text-2xl font-black uppercase tracking-tight">OFF</p>
              <p className="mt-3 text-sm font-semibold">En tu primera compra</p>
            </div>

            <form onSubmit={submit} className="px-7 py-6">
              <p className="mb-4 text-center text-sm text-navy/70">
                Dejanos tu nombre y tu mail y te enviamos el código.
              </p>

              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-navy/50">
                Nombre y apellido
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                placeholder="Juan Pérez"
                className="input mb-3 w-full"
              />

              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-navy/50">
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                type="email"
                autoComplete="email"
                placeholder="juan@email.com"
                className="input w-full"
              />

              {error && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="mt-5 w-full rounded-full bg-navy py-3.5 text-sm font-black uppercase tracking-wide text-cream transition hover:bg-navy/90 disabled:opacity-60"
              >
                {sending ? 'Enviando…' : 'Quiero mi 10%'}
              </button>

              <p className="mt-3 text-center text-[11px] leading-relaxed text-navy/45">
                Válido solo en la primera compra. Te escribimos únicamente por tus
                pedidos y novedades de la tienda.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
