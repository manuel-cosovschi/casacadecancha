'use client';

import { useState } from 'react';
import { EncargoForm, type MatrixRow, type CatalogVariant } from './EncargoForm';

export function NewEncargoForm({ matrix, catalog }: { matrix: MatrixRow[]; catalog: CatalogVariant[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Nuevo encargo
      </button>
    );
  }
  return <EncargoForm matrix={matrix} catalog={catalog} onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />;
}
