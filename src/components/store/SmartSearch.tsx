'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { searchCatalog, type SearchResponse } from '@/app/(store)/camisetas/search-actions';
import { formatPrice } from '@/lib/utils';

/**
 * Buscador del catálogo en lenguaje natural.
 *
 * Lo importante pasa cuando NO encuentra: en vez de un "sin resultados" que
 * termina la visita, ofrece encargar la camiseta con el pedido ya armado a
 * partir de lo que se entendió. Ahí es donde estaba la venta que se perdía.
 */
const EJEMPLOS = [
  'una retro de Italia',
  'la del Milan de Kaká',
  'algo de Argentina hasta 50 lucas',
  'camiseta de arquero',
];

export function SmartSearch() {
  const [query, setQuery] = useState('');
  const [res, setRes] = useState<SearchResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscar(q: string) {
    const limpio = q.trim();
    if (limpio.length < 2) return;
    setBusy(true);
    setError(null);
    try {
      setRes(await searchCatalog(limpio));
    } catch {
      setError('No pudimos buscar ahora. Probá de nuevo en un momento.');
    } finally {
      setBusy(false);
    }
  }

  function limpiar() {
    setQuery('');
    setRes(null);
    setError(null);
  }

  const sinResultados = res !== null && res.hits.length === 0;

  return (
    <section className="mb-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          buscar(query);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-navy/35"
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá como se te ocurra: «una retro de Italia»"
            aria-label="Buscar camisetas"
            className="input w-full !py-3.5 !pl-11 !pr-10 text-base"
          />
          {query && (
            <button
              type="button"
              onClick={limpiar}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy"
            >
              ✕
            </button>
          )}
        </div>
        <button type="submit" disabled={busy || query.trim().length < 2} className="btn-primary !px-6">
          {busy ? '…' : 'Buscar'}
        </button>
      </form>

      {!res && !busy && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-navy/45">Probá:</span>
          {EJEMPLOS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                setQuery(e);
                buscar(e);
              }}
              className="rounded-full border border-navy/15 bg-white px-3 py-1 text-xs font-medium text-navy/70 transition hover:border-navy hover:text-navy"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>
      )}

      {busy && <p className="mt-4 text-sm text-navy/50">Buscando…</p>}

      {res && !busy && (
        <div className="mt-5">
          {res.reply && <p className="mb-3 text-sm font-medium text-navy/75">{res.reply}</p>}

          {res.hits.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {res.hits.map((h) => (
                <li key={h.slug}>
                  <Link
                    href={`/producto/${h.slug}`}
                    className="card group block overflow-hidden transition hover:shadow-lift"
                  >
                    <div className="relative aspect-[4/5] bg-navy/5">
                      {h.image && (
                        <Image
                          src={h.image}
                          alt={h.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover transition group-hover:scale-[1.03]"
                        />
                      )}
                      {h.agotado && (
                        <span className="absolute left-2 top-2 rounded-full bg-navy/80 px-2 py-0.5 text-[10px] font-bold uppercase text-cream">
                          Agotada
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-2 text-sm font-semibold leading-tight">{h.name}</p>
                      <p className="mt-1 text-sm font-bold">{formatPrice(h.price)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <NoLaTenemos res={res} query={query} />
          )}

          {res.hits.length > 0 && (
            <button
              type="button"
              onClick={limpiar}
              className="mt-4 text-sm font-medium text-navy/55 underline hover:text-navy"
            >
              Ver todo el catálogo
            </button>
          )}
        </div>
      )}

      {sinResultados && !res.inteligente && (
        <p className="mt-2 text-xs text-navy/40">
          Buscamos por palabras. Si no aparece lo que buscás, pedilo como encargo.
        </p>
      )}
    </section>
  );
}

/**
 * El caso que importa: no la tenemos.
 *
 * En vez de cortar la visita con un "sin resultados", se ofrece encargarla con
 * lo que ya se entendió del pedido, para que del otro lado solo queden los
 * datos de contacto.
 */
function NoLaTenemos({ res, query }: { res: SearchResponse; query: string }) {
  const u = res.understood;
  const params = new URLSearchParams();
  const descripcion =
    [u?.equipo, u?.anio, u?.version].filter(Boolean).join(' ') ||
    query.trim();
  if (descripcion) params.set('p', descripcion);
  if (u?.jugador) params.set('j', u.jugador);
  if (res.searchId) params.set('s', res.searchId);

  return (
    <div className="rounded-2xl border-2 border-celeste/40 bg-celeste/10 p-5">
      <p className="text-base font-bold text-navy">Esa no la tenemos en stock</p>
      {u?.equipo && (
        <p className="mt-1.5 text-sm text-navy/75">
          Entendimos que buscás{' '}
          <strong>
            {[u.equipo, u.anio, u.version].filter(Boolean).join(' ')}
            {u.jugador ? ` de ${u.jugador}` : ''}
          </strong>
          .
        </p>
      )}
      <p className="mt-1.5 text-sm text-navy/75">
        La podemos traer a pedido. Tarda entre 7 y 14 días hábiles y te la dejamos reservada.
      </p>
      <Link href={`/encargos?${params.toString()}`} className="btn-primary mt-4 inline-flex">
        Encargar esta camiseta
      </Link>
    </div>
  );
}
