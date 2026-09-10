'use client';

import { useRef, useState } from 'react';
import { identifyShirtPhoto } from './photo-actions';
import type { Identificacion } from '@/lib/shirt-photo';

/**
 * Subir la captura en vez de describir la camiseta.
 *
 * Describir una camiseta con palabras es la parte difícil de pedir un encargo:
 * nadie sabe si la que vio en Instagram es la 2006 o la 2007. Con la foto
 * alcanza, y el renglón del pedido se escribe solo.
 *
 * La imagen no se sube a ningún lado: se lee en el navegador, viaja en la
 * consulta y se descarta. Lo único que queda es el texto identificado.
 */
const MAX_MB = 5;

export function ShirtPhotoPicker({
  onIdentified,
}: {
  onIdentified: (descripcion: string, data: Identificacion) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Identificacion | null>(null);

  function reset() {
    setPreview(null);
    setData(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function onFile(file: File) {
    setError(null);
    setData(null);
    if (!file.type.startsWith('image/')) {
      setError('Tiene que ser una imagen.');
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`La imagen no puede pesar más de ${MAX_MB} MB.`);
      return;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('read'));
      r.readAsDataURL(file);
    }).catch(() => null);

    if (!dataUrl) {
      setError('No pudimos leer ese archivo.');
      return;
    }

    setPreview(dataUrl);
    setBusy(true);
    try {
      const res = await identifyShirtPhoto(dataUrl);
      if (!res.ok || !res.data) {
        setError(res.message || 'No pudimos identificar la camiseta.');
        return;
      }
      setData(res.data);
      onIdentified(res.data.descripcion, res.data);
    } catch {
      setError('No pudimos identificar la camiseta. Probá de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  const dudoso = data && data.confidence !== 'alta';

  return (
    <div className="rounded-xl border-2 border-dashed border-celeste/50 bg-celeste/10 p-4">
      <p className="text-sm font-bold text-navy">📸 ¿La viste en Instagram? Subí la captura</p>
      <p className="mt-1 text-xs leading-relaxed text-navy/60">
        La reconocemos y completamos el pedido por vos. No hace falta que sepas el año ni la
        versión.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="btn border-2 border-navy text-navy hover:bg-navy hover:text-cream !py-2 disabled:opacity-60"
        >
          {busy ? 'Mirando la foto…' : preview ? 'Probar con otra' : 'Elegir imagen'}
        </button>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="La imagen que subiste"
            className="h-16 w-16 rounded-lg border border-navy/10 object-cover"
          />
        )}
        {(preview || error) && !busy && (
          <button
            type="button"
            onClick={reset}
            className="text-xs font-medium text-navy/50 underline hover:text-navy"
          >
            Quitar
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {data && (
        <div className="mt-3 rounded-xl border border-green-600/25 bg-green-50 p-3">
          <p className="text-sm font-bold text-green-800">
            {dudoso ? '🤔 Puede ser esta' : '✅ Es esta'}: {data.descripcion}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-green-800/80">
            {data.equipo && <li>Equipo: {data.equipo}</li>}
            {data.anio && <li>Año: {data.anio}</li>}
            {data.version && <li>Versión: {data.version}</li>}
            {data.marca && <li>Marca: {data.marca}</li>}
            {data.jugador && (
              <li>
                Jugador: {data.jugador}
                {data.dorsal ? ` ${data.dorsal}` : ''}
              </li>
            )}
          </ul>
          {data.detalles && (
            <p className="mt-1 text-xs text-green-800/70">{data.detalles}</p>
          )}
          <p className="mt-2 text-xs text-green-800/70">
            {dudoso
              ? 'No estamos del todo seguros: revisá el renglón de arriba y corregilo si hace falta.'
              : 'Ya la cargamos en tu pedido. Si algo no está bien, editá el renglón de arriba.'}
          </p>
        </div>
      )}
    </div>
  );
}
