'use client';

import { useState } from 'react';
import { enviarPromoSemana, type EnvioResult } from './actions';

/**
 * Anunciar a los suscriptores la promo que está corriendo esta semana.
 *
 * El contenido no se escribe acá: sale del calendario de promos y de la tabla
 * de cupones, así que el mail siempre dice lo mismo que la página. Lo que se
 * muestra abajo es exactamente lo que va a recibir la gente.
 *
 * No se manda solo, a propósito. Las promos se prenden solas porque un precio
 * mal puesto se corrige; un mail mandado no se puede volver atrás.
 */
export function PromoSemana({
  destinatarios,
  previewHtml,
  label,
  hasta,
}: {
  destinatarios: number;
  previewHtml: string | null;
  label: string | null;
  hasta: string | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState<'prueba' | 'todos' | null>(null);
  const [res, setRes] = useState<EnvioResult | null>(null);

  async function mandar(soloPrueba: boolean) {
    if (!soloPrueba) {
      const seguro = window.confirm(
        `Se le va a anunciar "${label}" a ${destinatarios} ${
          destinatarios === 1 ? 'persona' : 'personas'
        }. Esto no se puede deshacer.\n\n¿Lo mando?`,
      );
      if (!seguro) return;
    }
    setEnviando(soloPrueba ? 'prueba' : 'todos');
    setRes(null);
    setRes(await enviarPromoSemana(soloPrueba));
    setEnviando(null);
  }

  if (!label) {
    return (
      <div className="card border-navy/10 p-5">
        <h2 className="text-base font-bold text-navy">Promo de la semana</h2>
        <p className="mt-1 text-sm text-navy/60">
          Esta semana no hay ninguna promo corriendo, así que no hay nada para anunciar.
          Cuando arranque la próxima aparece acá sola, armada y lista para mandar.
        </p>
      </div>
    );
  }

  return (
    <div className="card border-gold/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-navy/40">
            Promo de la semana
          </p>
          <h2 className="mt-0.5 text-base font-bold uppercase text-navy">{label}</h2>
          <p className="mt-1 text-sm text-navy/60">
            Termina el {hasta}. Le llega a los {destinatarios} suscriptores del popup, cada
            uno con su nombre.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="rounded-full border border-navy/15 px-4 py-2 text-xs font-bold text-navy/70 transition hover:border-navy hover:text-navy"
        >
          {abierto ? 'Ocultar el mail' : 'Ver el mail'}
        </button>
      </div>

      {abierto && previewHtml && (
        <div className="mt-4 rounded-2xl border border-navy/10 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy/45">
            Asunto: <span className="normal-case text-navy/75">{label} — solo esta semana</span>
          </p>
          <div
            className="overflow-x-auto rounded-xl bg-cream/40 p-4"
            // Es nuestra propia plantilla, armada en el servidor.
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={enviando !== null}
          onClick={() => mandar(true)}
          className="rounded-full border border-navy/15 px-5 py-2.5 text-sm font-bold text-navy transition hover:border-navy disabled:opacity-50"
        >
          {enviando === 'prueba' ? 'Enviando…' : 'Mandármelo a mí primero'}
        </button>
        <button
          type="button"
          disabled={enviando !== null}
          onClick={() => mandar(false)}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {enviando === 'todos' ? 'Enviando…' : `Anunciar a los ${destinatarios} suscriptores`}
        </button>
      </div>

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
