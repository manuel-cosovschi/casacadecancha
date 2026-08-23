'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice, whatsappLink } from '@/lib/utils';
import { StatusBadge } from '@/components/admin/ui';
import {
  createAuction,
  setAuctionStatus,
  extendAuction,
  deleteAuction,
  setBidderStatus,
  voidBid,
} from './actions';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://casacadecancha.shop';

export function NewAuctionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    title: '',
    description: '',
    image_url: '',
    size: '',
    start_price: '',
    min_increment: '2000',
    max_bid: '',
    ends_at: '',
    anti_snipe_seconds: '120',
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  // Atajo: terminar en X horas desde ahora.
  function inHours(h: number) {
    const d = new Date(Date.now() + h * 3600_000 - new Date().getTimezoneOffset() * 60_000);
    set('ends_at', d.toISOString().slice(0, 16));
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary !py-2">
        + Nueva subasta
      </button>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">Nueva subasta</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Qué subastás</label>
          <input className="input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Camiseta Japón Titular 26/27" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Foto (URL)</label>
          <input className="input" value={f.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className="label">Talle</label>
          <input className="input" value={f.size} onChange={(e) => set('size', e.target.value)} placeholder="L" />
        </div>
        <div>
          <label className="label">Precio base</label>
          <input className="input" type="number" value={f.start_price} onChange={(e) => set('start_price', e.target.value)} placeholder="30000" />
        </div>
        <div>
          <label className="label">Incremento mínimo</label>
          <input className="input" type="number" value={f.min_increment} onChange={(e) => set('min_increment', e.target.value)} />
        </div>
        <div>
          <label className="label">Tope por puja (opcional)</label>
          <input className="input" type="number" value={f.max_bid} onChange={(e) => set('max_bid', e.target.value)} placeholder="150000" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Termina</label>
          <input className="input" type="datetime-local" value={f.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {[1, 3, 24, 48, 72].map((h) => (
              <button key={h} type="button" onClick={() => inHours(h)} className="rounded-full border border-navy/15 px-2.5 py-1 text-xs font-semibold text-navy/70 hover:border-navy">
                {h < 24 ? `${h} h` : `${h / 24} día${h > 24 ? 's' : ''}`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="label">Anti-sniping (segundos)</label>
          <input className="input" type="number" value={f.anti_snipe_seconds} onChange={(e) => set('anti_snipe_seconds', e.target.value)} />
          <p className="mt-1 text-xs text-navy/45">Si pujan sobre la hora, se estira este tiempo.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Descripción</label>
          <textarea className="input min-h-16" value={f.description} onChange={(e) => set('description', e.target.value)} />
        </div>
      </div>
      {err && <p className="mt-3 text-sm font-semibold text-red-600">{err}</p>}
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => {
            setErr(null);
            start(async () => {
              const res = await createAuction({
                title: f.title,
                description: f.description,
                image_url: f.image_url,
                size: f.size,
                start_price: Number(f.start_price),
                min_increment: Number(f.min_increment),
                max_bid: f.max_bid ? Number(f.max_bid) : null,
                ends_at: f.ends_at,
                anti_snipe_seconds: Number(f.anti_snipe_seconds),
              });
              if (res.error) setErr(res.error);
              else {
                setOpen(false);
                router.refresh();
              }
            });
          }}
          disabled={busy}
          className="btn-primary !py-2"
        >
          {busy ? 'Creando…' : 'Crear en borrador'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-outline !py-2">Cancelar</button>
      </div>
    </div>
  );
}

export function AuctionCard({ a }: { a: any }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const url = `${SITE}/subasta/${a.slug}`;
  const bids = (a.bids ?? []).filter((b: any) => !b.voided);
  const top = bids[0];
  const ends = new Date(a.ends_at);

  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-navy">{a.title}</h3>
            <StatusBadge status={a.status} />
          </div>
          <p className="mt-0.5 text-xs text-navy/50">
            {a.size ? `Talle ${a.size} · ` : ''}base {formatPrice(a.start_price)} · incremento{' '}
            {formatPrice(a.min_increment)}
            {a.max_bid ? ` · tope ${formatPrice(a.max_bid)}` : ''}
          </p>
          <p className="text-xs text-navy/50">
            {a.status === 'finalizada' ? 'Terminó' : 'Termina'} el {ends.toLocaleString('es-AR')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-navy/45">
            {bids.length > 0 ? 'Va ganando' : 'Sin ofertas'}
          </p>
          <p className="text-2xl font-black text-navy">
            {formatPrice(top?.amount ?? a.start_price)}
          </p>
          {top?.bidder && (
            <p className="text-xs text-navy/60">
              {top.bidder.name} · {top.bidder.phone}
            </p>
          )}
        </div>
      </div>

      {/* Ganador */}
      {a.status === 'finalizada' && top?.bidder && (
        <div className="mt-3 rounded-xl bg-green-50 p-3">
          <p className="text-sm font-bold text-green-800">
            🏆 Ganó {top.bidder.name} con {formatPrice(top.amount)}
          </p>
          <a
            href={whatsappLink(
              top.bidder.phone,
              `¡Hola ${top.bidder.name.split(' ')[0]}! Ganaste la subasta de ${a.title} por ${formatPrice(top.amount)}. Te paso los datos para coordinar el pago y la entrega.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-wsp mt-2 !py-1.5 !px-3 text-xs"
          >
            Avisarle por WhatsApp
          </a>
        </div>
      )}

      {/* Acciones */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {a.status === 'borrador' && (
          <button onClick={() => act(() => setAuctionStatus(a.id, 'activa'))} disabled={busy} className="btn-celeste !py-1.5 !px-3 text-xs">
            ▶ Arrancar
          </button>
        )}
        {a.status === 'activa' && (
          <>
            <button onClick={() => act(() => setAuctionStatus(a.id, 'finalizada'))} disabled={busy} className="btn-primary !py-1.5 !px-3 text-xs">
              ■ Cerrar ahora
            </button>
            {[5, 15].map((m) => (
              <button key={m} onClick={() => act(() => extendAuction(a.id, m))} disabled={busy} className="badge border border-navy/20 text-navy/70 hover:bg-navy/5">
                +{m} min
              </button>
            ))}
          </>
        )}
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
            } catch {
              /* ignore */
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
          className="badge border border-navy/20 text-navy/70 hover:bg-navy/5"
        >
          {copied ? '¡Copiado! ✔' : 'Copiar link'}
        </button>
        <a href={`/subasta/${a.slug}/vivo`} target="_blank" rel="noopener noreferrer" className="badge border border-navy/20 text-navy/70 hover:bg-navy/5">
          Pantalla para transmitir ↗
        </a>
        {a.status !== 'activa' && (
          <button
            onClick={() => {
              if (confirm('¿Borrar la subasta y todas sus pujas?')) act(() => deleteAuction(a.id));
            }}
            disabled={busy}
            className="ml-auto text-xs font-semibold text-red-600 hover:underline"
          >
            Borrar
          </button>
        )}
      </div>

      {/* Pujas */}
      {bids.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-semibold text-navy/55">
            Ver las {bids.length} pujas
          </summary>
          <ul className="mt-2 divide-y divide-navy/5">
            {bids.map((b: any) => (
              <li key={b.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                <span className="min-w-0 truncate">
                  <strong>{formatPrice(b.amount)}</strong>{' '}
                  <span className="text-navy/55">
                    {b.bidder?.name} · {b.bidder?.phone}
                  </span>
                </span>
                <button
                  onClick={() => {
                    if (confirm('¿Anular esta puja? Podés bloquear también a la persona.')) {
                      const block = confirm('¿Bloquear a esta persona para futuras subastas?');
                      act(() => voidBid(b.id, block));
                    }
                  }}
                  disabled={busy}
                  className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
                >
                  Anular
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function BiddersPanel({ bidders }: { bidders: any[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const pend = bidders.filter((b) => b.status === 'pendiente');
  const rest = bidders.filter((b) => b.status !== 'pendiente');

  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const Row = ({ b }: { b: any }) => (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <div className="min-w-0">
        <p className="font-semibold text-navy">
          {b.name}{' '}
          {b.is_customer && <span className="badge bg-green-100 text-green-800">ya compró</span>}
        </p>
        <a
          href={whatsappLink(b.phone, `¡Hola ${b.name.split(' ')[0]}! Te habilitamos para pujar en la subasta de Casaca de Cancha 👊`)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-celeste-bright hover:underline"
        >
          {b.phone} ↗
        </a>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge status={b.status} />
        {b.status !== 'aprobado' && (
          <button onClick={() => act(() => setBidderStatus(b.id, 'aprobado'))} disabled={busy} className="badge bg-green-100 text-green-800 hover:bg-green-200">
            ✓ Habilitar
          </button>
        )}
        {b.status !== 'bloqueado' && (
          <button onClick={() => act(() => setBidderStatus(b.id, 'bloqueado'))} disabled={busy} className="badge border border-red-200 text-red-600 hover:bg-red-50">
            Bloquear
          </button>
        )}
      </div>
    </li>
  );

  return (
    <div className="card p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
        Postores {pend.length > 0 && <span className="text-amber-600">· {pend.length} esperando</span>}
      </h2>
      {bidders.length === 0 ? (
        <p className="mt-2 text-sm text-navy/50">Todavía no se registró nadie.</p>
      ) : (
        <>
          {pend.length > 0 && (
            <>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-amber-600">
                Esperando que los habilites
              </p>
              <ul className="divide-y divide-navy/5">
                {pend.map((b) => (
                  <Row key={b.id} b={b} />
                ))}
              </ul>
            </>
          )}
          {rest.length > 0 && (
            <>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-navy/45">
                Habilitados y bloqueados
              </p>
              <ul className="divide-y divide-navy/5">
                {rest.map((b) => (
                  <Row key={b.id} b={b} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
