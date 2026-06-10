'use client';

import { useState } from 'react';
import { submitTransferProof } from './actions';

export function TransferProofUpload({ orderNumber }: { orderNumber: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!file) {
      setError('Seleccioná el archivo del comprobante.');
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set('orderNumber', orderNumber);
    fd.set('file', file);
    const res = await submitTransferProof(fd);
    setBusy(false);
    if (res.error) setError(res.error);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="mt-4 rounded-lg bg-green-50 p-4 text-center">
        <p className="font-semibold text-green-700">¡Comprobante recibido! ✅</p>
        <p className="mt-1 text-sm text-green-700/80">
          Tu pedido quedó <strong>en revisión</strong>. Validamos el pago y te confirmamos por
          WhatsApp. ¡Gracias!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-lg border border-navy/15 p-4">
      <p className="text-sm font-semibold text-navy">Subí tu comprobante</p>
      <p className="mt-0.5 text-xs text-navy/60">
        Imagen (JPG/PNG) o PDF, hasta 8 MB. Lo revisamos y aprobamos tu pedido.
      </p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => {
          setFile(e.target.files?.[0] ?? null);
          setError(null);
        }}
        className="mt-3 w-full text-sm"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || !file}
        className="btn-primary mt-3 w-full"
      >
        {busy ? 'Subiendo…' : 'Enviar comprobante'}
      </button>
    </div>
  );
}
