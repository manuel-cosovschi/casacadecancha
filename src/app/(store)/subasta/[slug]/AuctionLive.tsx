'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { getAuctionState, placeBid, registerBidder } from './actions';
import type { AuctionState } from '@/lib/auctions';

/** Cuenta regresiva calculada contra el reloj del servidor (no el del celular). */
function useCountdown(state: AuctionState | null) {
  const [left, setLeft] = useState(0);
  const offset = useRef(0);

  useEffect(() => {
    if (!state) return;
    offset.current = new Date(state.server_now).getTime() - Date.now();
  }, [state]);

  useEffect(() => {
    if (!state) return;
    const end = new Date(state.ends_at).getTime();
    const tick = () => setLeft(Math.max(0, end - (Date.now() + offset.current)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [state]);

  return left;
}

export function formatLeft(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function AuctionLive({ initial, slug }: { initial: AuctionState; slug: string }) {
  const [state, setState] = useState<AuctionState>(initial);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showReg, setShowReg] = useState(false);
  const left = useCountdown(state);
  const ended = state.status === 'finalizada' || left <= 0;

  const refresh = useCallback(async () => {
    const s = await getAuctionState(slug);
    if (s) setState(s);
  }, [slug]);

  // Refresco en vivo: cada 3 s, y más seguido sobre el final.
  useEffect(() => {
    if (ended) return;
    const every = left < 60_000 ? 1500 : 3000;
    const id = setInterval(refresh, every);
    return () => clearInterval(id);
  }, [refresh, ended, left]);

  // Al terminar, una última consulta para mostrar al ganador.
  useEffect(() => {
    if (left <= 0 && state.status !== 'finalizada') {
      const id = setTimeout(refresh, 1200);
      return () => clearTimeout(id);
    }
  }, [left, state.status, refresh]);

  const approved = state.me?.status === 'aprobado';
  const pending = state.me?.status === 'pendiente';
  const blocked = state.me?.status === 'bloqueado';

  async function bid(value: number) {
    setError(null);
    setBusy(true);
    const res = await placeBid(slug, value);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      refresh();
      return;
    }
    if (res.state) setState(res.state);
    setAmount('');
  }

  const next = state.next_min;
  const quick = [next, next + state.min_increment, next + state.min_increment * 2];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* Imagen */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-cream-soft">
        {state.image_url ? (
          <Image src={state.image_url} alt={state.title} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" priority />
        ) : (
          <div className="flex h-full items-center justify-center text-navy/25">Sin foto</div>
        )}
        {!ended && (
          <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> En vivo
          </span>
        )}
      </div>

      {/* Panel */}
      <div>
        <h1 className="text-3xl font-black uppercase leading-tight text-navy sm:text-4xl">
          {state.title}
        </h1>
        {state.size && <p className="mt-1 text-sm font-semibold text-navy/60">Talle {state.size}</p>}
        {state.description && <p className="mt-3 text-navy/70">{state.description}</p>}

        {/* Precio y reloj */}
        <div className="mt-5 rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-navy/45">
                {state.has_bids ? 'Oferta actual' : 'Precio base'}
              </p>
              <p className="text-4xl font-black text-navy">{formatPrice(state.current_price)}</p>
              <p className="mt-0.5 text-xs text-navy/50">
                {state.bid_count} {state.bid_count === 1 ? 'puja' : 'pujas'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-widest text-navy/45">
                {ended ? 'Terminó' : 'Termina en'}
              </p>
              <p className={`text-3xl font-black tabular-nums ${left < 60_000 && !ended ? 'text-red-600' : 'text-navy'}`}>
                {ended ? '—' : formatLeft(left)}
              </p>
            </div>
          </div>

          {ended ? (
            <div className="mt-4 rounded-xl bg-navy p-4 text-center text-cream">
              <p className="text-xs font-bold uppercase tracking-widest text-celeste">Ganador</p>
              <p className="mt-1 text-2xl font-black">{state.winner || 'Sin ofertas'}</p>
              {state.winner && (
                <p className="mt-1 text-sm text-cream/70">
                  {formatPrice(state.current_price)} · te escribimos por WhatsApp para coordinar
                </p>
              )}
            </div>
          ) : blocked ? (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700">
              Tu cuenta no está habilitada para pujar.
            </p>
          ) : pending ? (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-center text-sm text-amber-900">
              ⏳ <strong>Te estamos habilitando.</strong> Es un paso rápido que hacemos a mano para
              que las ofertas sean reales. Te avisamos por WhatsApp; mientras tanto podés seguir la
              subasta.
            </p>
          ) : approved ? (
            <div className="mt-4">
              {state.me?.is_top && (
                <p className="mb-2 rounded-lg bg-green-50 p-2 text-center text-sm font-bold text-green-700">
                  🏆 Vas ganando
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {quick.map((q) => (
                  <button
                    key={q}
                    onClick={() => bid(q)}
                    disabled={busy || Boolean(state.max_bid && q > state.max_bid)}
                    className="btn-celeste flex-1 !px-3 !py-2.5 text-sm"
                  >
                    {formatPrice(q)}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Otro monto (mín. ${formatPrice(next)})`}
                />
                <button
                  onClick={() => bid(Number(amount))}
                  disabled={busy || !amount}
                  className="btn-primary !py-2.5"
                >
                  {busy ? '…' : 'Pujar'}
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-navy/45">
                Incremento mínimo {formatPrice(state.min_increment)}
                {state.max_bid ? ` · máximo por puja ${formatPrice(state.max_bid)}` : ''}
              </p>
            </div>
          ) : (
            <button onClick={() => setShowReg(true)} className="btn-primary mt-4 w-full">
              Quiero pujar
            </button>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 p-2 text-center text-sm font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* Historial */}
        {state.bids.length > 0 && (
          <div className="mt-4 rounded-2xl border border-navy/10 bg-white p-4 shadow-card">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-navy/45">Ofertas</p>
            <ul className="divide-y divide-navy/5">
              {state.bids.map((b, i) => (
                <li key={i} className="flex items-center justify-between py-1.5 text-sm">
                  <span className={i === 0 ? 'font-bold text-navy' : 'text-navy/65'}>
                    {i === 0 && '🏆 '}
                    {b.who}
                  </span>
                  <span className={i === 0 ? 'font-black text-navy' : 'font-medium text-navy/65'}>
                    {formatPrice(b.amount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-xs text-navy/45">
          Las pujas son en serio: para participar verificamos quién sos. Si ganás, te escribimos por
          WhatsApp para coordinar el pago y la entrega.
        </p>
      </div>

      {showReg && <RegisterModal onClose={() => setShowReg(false)} onDone={refresh} />}
    </div>
  );
}

function RegisterModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    const res = await registerBidder(name, phone);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDone(res.status || 'pendiente');
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div className="text-center">
            <p className="text-3xl">{done === 'aprobado' ? '✅' : '⏳'}</p>
            <h2 className="mt-2 text-xl font-extrabold text-navy">
              {done === 'aprobado' ? '¡Ya podés pujar!' : 'Te estamos habilitando'}
            </h2>
            <p className="mt-2 text-sm text-navy/65">
              {done === 'aprobado'
                ? 'Como ya nos compraste antes, quedaste habilitado al instante.'
                : 'Lo hacemos a mano para que todas las ofertas sean reales. Te avisamos por WhatsApp en cuanto te habilitemos — suele ser rápido.'}
            </p>
            <button onClick={onClose} className="btn-primary mt-5 w-full">
              Entendido
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-extrabold text-navy">Verificá tu WhatsApp</h2>
            <p className="mt-1 text-sm text-navy/65">
              Pedimos esto para que las ofertas sean reales y nadie arruine la subasta. Si ya nos
              compraste, entrás al toque.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Nombre y apellido</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="label">WhatsApp</label>
                <input
                  className="input"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="2235123456"
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={submit} disabled={busy} className="btn-primary flex-1">
                {busy ? 'Enviando…' : 'Continuar'}
              </button>
              <button onClick={onClose} className="btn-outline">
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
