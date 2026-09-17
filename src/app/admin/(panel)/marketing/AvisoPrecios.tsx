'use client';

import { useState } from 'react';
import { enviarAvisoBajaPrecios, type EnvioResult } from './actions';

/**
 * Mandar el aviso de baja de precios a los suscriptores.
 *
 * El mail se muestra tal cual va a salir, arriba del botón. Mandarle algo a
 * toda la lista no se puede deshacer: lo mínimo es poder leerlo antes, y poder
 * mandárselo a uno mismo primero para verlo en la casilla de verdad, que nunca
 * se ve igual que en una vista previa.
 */
export function AvisoPrecios({
  destinatarios,
  previewHtml,
  asunto,
}: {
  destinatarios: number;
  previewHtml: string;
  asunto: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState<'prueba' | 'todos' | null>(null);
  const [res, setRes] = useState<EnvioResult | null>(null);

  async function mandar(soloPrueba: boolean) {
    if (!soloPrueba) {
      const seguro = window.confirm(
        `Se le va a mandar el mail a ${destinatarios} ${
          destinatarios === 1 ? 'persona' : 'personas'
        }. Esto no se puede deshacer.\n\n¿Lo mando?`,
      );
      if (!seguro) return;
    }
    setEnviando(soloPrueba ? 'prueba' : 'todos');
    setRes(null);
    setRes(await enviarAvisoBajaPrecios(soloPrueba));
    setEnviando(null);
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-navy">Avisar que bajaron los precios</h2>
          <p className="mt-1 text-sm text-navy/60">
            Le llega a los {destinatarios} suscriptores del popup, cada uno con su nombre.
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

      {abierto && (
        <div className="mt-4 rounded-2xl border border-navy/10 bg-white p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-navy/45">
            Asunto: <span className="normal-case text-navy/75">{asunto}</span>
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
          {enviando === 'todos'
            ? 'Enviando…'
            : `Enviar a los ${destinatarios} suscriptores`}
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
