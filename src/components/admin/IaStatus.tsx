'use client';

import { useState } from 'react';
import { probarIaAction, type EstadoIa } from '@/app/admin/(panel)/configuracion/email-actions';

const NOMBRES = { anthropic: 'Claude (Anthropic)', openai: 'GPT (OpenAI)' } as const;

/**
 * Qué IA está funcionando, y un botón para comprobarlo de verdad.
 *
 * Que la variable esté cargada no quiere decir que sirva: la key puede estar
 * vencida, sin saldo, o el modelo puesto puede no existir. Sin este botón, el
 * buscador se degrada a búsqueda por texto y por fuera se ve igual que
 * funcionando — que es exactamente lo que pasó con los mails.
 */
export function IaStatus({ estado }: { estado: EstadoIa }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; mensaje: string } | null>(null);

  async function probar() {
    setBusy(true);
    setRes(null);
    setRes(await probarIaAction());
    setBusy(false);
  }

  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">
        Buscador con IA y lectura de fotos
      </h2>

      {!estado.activo ? (
        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800">Están apagadas</p>
          <p className="mt-1 text-sm text-amber-900/80">
            El buscador en lenguaje natural y el encargo por foto están hechos, pero necesitan
            una key. Mientras tanto el buscador funciona por texto —encuentra menos, pero
            encuentra— y la subida de fotos avisa que no está disponible.
          </p>
          <p className="mt-2 text-sm text-amber-900/80">
            Cargá en Vercel <code>ANTHROPIC_API_KEY</code> <strong>o</strong>{' '}
            <code>OPENAI_API_KEY</code> — con cualquiera de las dos alcanza — y redeployá.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2 text-sm">
            <span className="text-green-600">✓</span>
            <span className="text-navy/70">
              Usando <strong className="text-navy">{NOMBRES[estado.proveedor!]}</strong> con el
              modelo <code className="text-navy">{estado.modelo}</code>
            </span>
          </li>
          {estado.ambas && (
            <li className="flex items-start gap-2 text-sm">
              <span className="text-navy/40">·</span>
              <span className="text-navy/60">
                Tenés las dos keys cargadas. Manda Claude; para usar la otra poné{' '}
                <code>AI_PROVIDER=openai</code> en Vercel.
              </span>
            </li>
          )}
        </ul>
      )}

      <div className="mt-5 border-t border-navy/10 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={probar} disabled={busy} className="btn-primary">
            {busy ? 'Probando…' : 'Probar que funcione'}
          </button>
          {res && (
            <span className={`text-sm ${res.ok ? 'text-green-700' : 'text-red-700'}`}>
              {res.mensaje}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-navy/50">
          Le pide una respuesta mínima al modelo. Si la key está vencida, sin saldo o el modelo
          no existe, acá lo vas a ver.
        </p>
      </div>
    </div>
  );
}
