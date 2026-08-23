'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { getAuctionState } from '../actions';
import type { AuctionState } from '@/lib/auctions';
import { formatLeft } from '../AuctionLive';

/**
 * Vista para transmitir (Instagram Live): precio grande, reloj y último postor.
 * Sin botones ni distracciones — se mira, no se toca.
 */
export function BroadcastView({ initial, slug }: { initial: AuctionState; slug: string }) {
  const [state, setState] = useState<AuctionState>(initial);
  const [flash, setFlash] = useState(false);
  const [left, setLeft] = useState(0);
  const offset = useRef(0);
  const lastCount = useRef(initial.bid_count);

  const refresh = useCallback(async () => {
    const s = await getAuctionState(slug);
    if (!s) return;
    if (s.bid_count > lastCount.current) {
      lastCount.current = s.bid_count;
      setFlash(true);
      setTimeout(() => setFlash(false), 900);
    }
    setState(s);
  }, [slug]);

  useEffect(() => {
    offset.current = new Date(state.server_now).getTime() - Date.now();
  }, [state]);

  useEffect(() => {
    const end = new Date(state.ends_at).getTime();
    const tick = () => setLeft(Math.max(0, end - (Date.now() + offset.current)));
    tick();
    const id = setInterval(tick, 300);
    return () => clearInterval(id);
  }, [state]);

  const ended = state.status === 'finalizada' || left <= 0;

  useEffect(() => {
    const id = setInterval(refresh, left < 60_000 && !ended ? 1200 : 2500);
    return () => clearInterval(id);
  }, [refresh, left, ended]);

  const urgent = left < 60_000 && !ended;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-navy text-cream">
      <div className="brand-stripes pointer-events-none absolute inset-0 opacity-40" />
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          backgroundImage:
            'radial-gradient(70% 55% at 78% 12%, rgba(140,200,232,.25), transparent 62%), radial-gradient(60% 50% at 10% 90%, rgba(199,167,107,.18), transparent 60%)',
        }}
      />

      <div className="relative flex h-full flex-col items-center justify-center gap-6 p-6 sm:flex-row sm:gap-10 sm:p-10">
        {/* Producto */}
        <div className="relative aspect-square w-[46vw] max-w-[420px] shrink-0 overflow-hidden rounded-3xl border-2 border-cream/15 sm:w-[38vw]">
          {state.image_url ? (
            <Image src={state.image_url} alt={state.title} fill sizes="420px" className="object-cover" priority />
          ) : (
            <div className="flex h-full items-center justify-center text-cream/20">Sin foto</div>
          )}
        </div>

        {/* Datos */}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          {!ended && (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3.5 py-1.5 text-sm font-black uppercase tracking-widest">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-white" /> En vivo
            </span>
          )}
          <h1 className="mt-3 text-4xl font-black uppercase leading-[0.95] sm:text-6xl">
            {state.title}
          </h1>
          {state.size && <p className="mt-1 text-xl font-bold text-celeste">Talle {state.size}</p>}

          <div className="mt-6">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-celeste">
              {state.has_bids ? 'Oferta actual' : 'Precio base'}
            </p>
            <p
              className={`text-[15vw] font-black leading-none tabular-nums transition-transform duration-300 sm:text-[9vw] ${
                flash ? 'scale-110 text-celeste' : 'scale-100'
              }`}
            >
              {formatPrice(state.current_price)}
            </p>
            {state.bids[0] && (
              <p className="mt-1 text-xl font-bold text-cream/80">
                🏆 {state.bids[0].who}
                <span className="ml-2 text-base font-medium text-cream/50">
                  · {state.bid_count} {state.bid_count === 1 ? 'puja' : 'pujas'}
                </span>
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 sm:justify-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-cream/50">
                {ended ? 'Terminó' : 'Termina en'}
              </p>
              <p className={`text-5xl font-black tabular-nums ${urgent ? 'animate-pulse text-red-400' : ''}`}>
                {ended ? '—' : formatLeft(left)}
              </p>
            </div>
            <div className="rounded-2xl border border-cream/20 px-4 py-2.5">
              <p className="text-xs font-bold uppercase tracking-widest text-cream/50">Pujá en</p>
              <p className="text-lg font-black text-celeste">casacadecancha.shop</p>
            </div>
          </div>

          {ended && (
            <div className="mt-6 rounded-2xl bg-celeste px-6 py-4 text-navy">
              <p className="text-sm font-black uppercase tracking-widest">Ganador</p>
              <p className="text-4xl font-black">{state.winner || 'Sin ofertas'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
