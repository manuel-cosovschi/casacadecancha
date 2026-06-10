'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addProductImage, deleteProductImage, uploadImage } from './actions';

export function ImagesManager({
  productId,
  images,
}: {
  productId: string;
  images: any[];
}) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addByUrl() {
    if (!url) return;
    setBusy(true);
    const fd = new FormData();
    fd.set('product_id', productId);
    fd.set('url', url);
    fd.set('alt_text', alt);
    const res = await addProductImage(fd);
    setBusy(false);
    if (res.error) setError(res.error);
    else {
      setUrl('');
      setAlt('');
      router.refresh();
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set('file', file);
    const up = await uploadImage(fd);
    if (up.error || !up.url) {
      setError(up.error || 'No se pudo subir.');
      setBusy(false);
      return;
    }
    const add = new FormData();
    add.set('product_id', productId);
    add.set('url', up.url);
    add.set('alt_text', alt);
    await addProductImage(add);
    setBusy(false);
    router.refresh();
  }

  async function remove(id: string) {
    await deleteProductImage(id);
    router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">Fotos</h2>

      {images.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg bg-navy/5">
              <Image src={img.url} alt={img.alt_text || ''} fill sizes="120px" className="object-cover" />
              {img.is_primary && (
                <span className="badge absolute left-1 top-1 bg-gold text-navy text-[9px]">Portada</span>
              )}
              <button
                onClick={() => remove(img.id)}
                className="absolute right-1 top-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 border-t border-navy/10 pt-4">
        <div>
          <span className="label">Subir archivo (Storage)</span>
          <input type="file" accept="image/*" onChange={onFile} disabled={busy} className="text-sm" />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex-1 text-xs">
            <span className="label">o pegá una URL</span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} className="input !py-1.5" placeholder="https://…" />
          </label>
          <label className="text-xs">
            <span className="label">Alt text</span>
            <input value={alt} onChange={(e) => setAlt(e.target.value)} className="input !py-1.5 w-40" />
          </label>
          <button onClick={addByUrl} disabled={busy || !url} className="btn-primary !py-2">
            Agregar
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-navy/50">
          Recomendado: 1:1 para producto, WebP, comprimida. La primera imagen es la portada.
        </p>
      </div>
    </div>
  );
}
