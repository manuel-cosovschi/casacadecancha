'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProduct } from './actions';

export function DeleteProductButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (!confirm('¿Seguro que querés eliminar este producto?')) return;
    setBusy(true);
    const res = await deleteProduct(id);
    if (res.error) {
      alert(res.error);
      setBusy(false);
      return;
    }
    router.push('/admin/productos');
  }

  return (
    <button onClick={handle} disabled={busy} className="btn border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white">
      {busy ? 'Eliminando…' : 'Eliminar producto'}
    </button>
  );
}
