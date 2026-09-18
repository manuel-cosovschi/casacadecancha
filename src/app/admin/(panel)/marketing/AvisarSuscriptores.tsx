'use client';

import { useState } from 'react';
import {
  previsualizarAviso,
  enviarAvisoLibre,
  type AvisoLibre,
  type ProductoAviso,
  type EnvioResult,
} from './actions';
import { formatPrice } from '@/lib/utils';

/**
 * Avisarle a los suscriptores de cualquier cosa: una promo, una baja de precio,
 * un cupón.
 *
 * Los tres casos son el mismo mail con distinta volanta, así que en vez de
 * programar uno por cada novedad hay un formulario. Los precios los pone el
 * sistema leyendo el catálogo: lo único que se escribe a mano es el texto.
 *
 * Solo aparecen las camisetas con stock comprable. Anunciar algo agotado hace
 * que la persona entre, no lo encuentre y no vuelva.
 */

const PLANTILLAS: Record<string, { volanta: string; titulo: string; bajada: string }> = {
  promo: {
    volanta: 'ESTA SEMANA',
    titulo: '',
    bajada: 'tenemos estas camisetas a precio de promo.',
  },
  baja: {
    volanta: 'BAJAMOS EL PRECIO',
    titulo: '',
    bajada: 'les bajamos el precio. No es una promo con fecha: es el precio nuevo y queda así.',
  },
  cupon: {
    volanta: 'TU CÓDIGO',
    titulo: '',
    bajada: 'te dejamos un código para usar en tu próxima compra.',
  },
};

export function AvisarSuscriptores({
  destinatarios,
  catalogo,
  cupones,
}: {
  destinatarios: number;
  catalogo: ProductoAviso[];
  cupones: { code: string; name: string; monto: number | null; porcentaje: number | null; minimo: number | null }[];
}) {
  const [tipo, setTipo] = useState<keyof typeof PLANTILLAS>('promo');
  const [volanta, setVolanta] = useState(PLANTILLAS.promo.volanta);
  const [titulo, setTitulo] = useState('');
  const [bajada, setBajada] = useState(PLANTILLAS.promo.bajada);
  const [hasta, setHasta] = useState('');
  const [sel, setSel] = useState<Record<string, { on: boolean; antes: string }>>({});
  const [codigo, setCodigo] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<'prueba' | 'todos' | 'preview' | null>(null);
  const [res, setRes] = useState<EnvioResult | null>(null);

  function cambiarTipo(t: keyof typeof PLANTILLAS) {
    setTipo(t);
    setVolanta(PLANTILLAS[t].volanta);
    setBajada(PLANTILLAS[t].bajada);
    setPreview(null);
  }

  function armar(): AvisoLibre {
    return {
      volanta,
      titulo,
      bajada,
      hasta: hasta.trim() || undefined,
      productos: Object.entries(sel)
        .filter(([, v]) => v.on)
        .map(([slug, v]) => ({ slug, antes: v.antes ? Number(v.antes) : null })),
      codigo: codigo || undefined,
    };
  }

  async function verPreview() {
    setEnviando('preview');
    setRes(null);
    const r = await previsualizarAviso(armar());
    setEnviando(null);
    if (r.error) setRes({ error: r.error });
    else setPreview(r.html ?? null);
  }

  async function mandar(soloPrueba: boolean) {
    if (!soloPrueba) {
      const seguro = window.confirm(
        `Se le va a mandar "${titulo}" a ${destinatarios} ${
          destinatarios === 1 ? 'persona' : 'personas'
        }. Esto no se puede deshacer.\n\n¿Lo mando?`,
      );
      if (!seguro) return;
    }
    setEnviando(soloPrueba ? 'prueba' : 'todos');
    setRes(null);
    setRes(await enviarAvisoLibre(armar(), soloPrueba));
    setEnviando(null);
  }

  const elegidos = Object.values(sel).filter((v) => v.on).length;

  return (
    <div className="card p-5">
      <h2 className="text-base font-bold text-navy">Avisarle a los suscriptores</h2>
      <p className="mt-1 text-sm text-navy/60">
        Para cuando sale una promo, bajás un precio o largás un cupón. Le llega a los{' '}
        {destinatarios} suscriptores, cada uno con su nombre. Los precios los pone el sistema.
      </p>

      {/* Tipo */}
      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ['promo', 'Sale una promo'],
            ['baja', 'Bajé un precio'],
            ['cupon', 'Largo un cupón'],
          ] as const
        ).map(([k, t]) => (
          <button
            key={k}
            type="button"
            onClick={() => cambiarTipo(k)}
            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
              tipo === k
                ? 'bg-navy text-cream'
                : 'border border-navy/15 text-navy/70 hover:border-navy'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Texto */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-navy/50">
            Volanta (el renglón chico de arriba)
          </span>
          <input value={volanta} onChange={(e) => setVolanta(e.target.value)} className="input w-full" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-navy/50">
            Título · también es el asunto del mail
          </span>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="SEMANA ICON"
            className="input w-full"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-navy/50">
            Bajada · va después del nombre de la persona
          </span>
          <input value={bajada} onChange={(e) => setBajada(e.target.value)} className="input w-full" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-navy/50">
            Hasta cuándo (opcional)
          </span>
          <input
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            placeholder="domingo 11 de octubre"
            className="input w-full"
          />
          <span className="mt-1 block text-[11px] text-navy/45">
            Vacío = sin fecha. Una baja de precio no vence; ponerle una urgencia que no existe es
            la forma más rápida de que la próxima vez no te crean.
          </span>
        </label>
        {cupones.length > 0 && (
          <label className="text-sm">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-navy/50">
              Anunciar un cupón (opcional)
            </span>
            <select value={codigo} onChange={(e) => setCodigo(e.target.value)} className="input w-full">
              <option value="">— ninguno —</option>
              {cupones.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} · {c.monto ? formatPrice(c.monto) : `${c.porcentaje}%`}
                  {c.minimo ? ` desde ${formatPrice(c.minimo)}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Productos */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-navy/50">
          Qué camisetas mostrar {elegidos > 0 && <span className="text-navy">· {elegidos} elegidas</span>}
        </p>
        <p className="mb-2 text-[11px] text-navy/45">
          Solo las que tienen stock. El &ldquo;antes&rdquo; sale del precio tachado que ya tiene
          cargado el producto; si está vacío no se muestra ningún tachado. No lo inventes: es de
          las pocas cosas que un cliente puede verificar.
        </p>
        <div className="max-h-64 overflow-y-auto rounded-xl border border-navy/10">
          {catalogo.length === 0 ? (
            <p className="p-3 text-sm text-navy/50">No hay ninguna camiseta con stock.</p>
          ) : (
            catalogo.map((p) => {
              const s = sel[p.slug] ?? { on: false, antes: '' };
              return (
                <div
                  key={p.slug}
                  className="flex flex-wrap items-center gap-2 border-b border-navy/5 px-3 py-2 text-sm last:border-0"
                >
                  <label className="flex flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={s.on}
                      onChange={(e) =>
                        setSel((v) => ({
                          ...v,
                          [p.slug]: {
                            on: e.target.checked,
                            antes: s.antes || (p.compare && p.compare > p.precio ? String(p.compare) : ''),
                          },
                        }))
                      }
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-navy/45">{p.talles}</span>
                  </label>
                  <span className="text-navy/60">{formatPrice(p.precio)}</span>
                  {s.on && (
                    <input
                      value={s.antes}
                      onChange={(e) => setSel((v) => ({ ...v, [p.slug]: { on: true, antes: e.target.value } }))}
                      placeholder="antes"
                      inputMode="numeric"
                      className="input w-24 !py-1 text-xs"
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={enviando !== null || !titulo.trim()}
          onClick={verPreview}
          className="rounded-full border border-navy/15 px-5 py-2.5 text-sm font-bold text-navy transition hover:border-navy disabled:opacity-50"
        >
          {enviando === 'preview' ? 'Armando…' : 'Ver cómo queda'}
        </button>
        <button
          type="button"
          disabled={enviando !== null || !titulo.trim()}
          onClick={() => mandar(true)}
          className="rounded-full border border-navy/15 px-5 py-2.5 text-sm font-bold text-navy transition hover:border-navy disabled:opacity-50"
        >
          {enviando === 'prueba' ? 'Enviando…' : 'Mandármelo a mí primero'}
        </button>
        <button
          type="button"
          disabled={enviando !== null || !titulo.trim()}
          onClick={() => mandar(false)}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {enviando === 'todos' ? 'Enviando…' : `Mandar a los ${destinatarios}`}
        </button>
      </div>

      {preview && (
        <div className="mt-4 rounded-2xl border border-navy/10 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy/45">
            Asunto: <span className="normal-case text-navy/75">{titulo}</span>
          </p>
          <div
            className="overflow-x-auto rounded-xl bg-cream/40 p-4"
            // Es nuestra propia plantilla, armada en el servidor.
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      )}

      {res && (
        <div
          className={`mt-4 rounded-xl border-2 p-3.5 text-sm ${
            res.error || (res.fallados ?? 0) > 0
              ? 'border-amber-500/30 bg-amber-50 text-amber-900'
              : 'border-green-600/25 bg-green-50 text-green-900'
          }`}
        >
          {res.error ? (
            res.error
          ) : (
            <>
              <strong>
                Salieron {res.enviados} {res.enviados === 1 ? 'mail' : 'mails'}.
              </strong>
              {(res.fallados ?? 0) > 0 && (
                <>
                  {' '}
                  {res.fallados} no {res.fallados === 1 ? 'pudo' : 'pudieron'} entregarse:
                  <ul className="mt-1.5 list-disc pl-5 text-[13px]">
                    {(res.detalle ?? []).map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
