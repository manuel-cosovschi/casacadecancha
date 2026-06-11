'use client';

import { useState } from 'react';
import { EncargoForm, type MatrixRow } from './EncargoForm';

export function NewEncargoForm({ matrix }: { matrix: MatrixRow[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Nuevo encargo
      </button>
    );
  }
  return <EncargoForm matrix={matrix} onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />;
}
