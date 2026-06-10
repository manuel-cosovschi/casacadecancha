'use client';

import { useState } from 'react';
import { EncargoForm } from './EncargoForm';

export function NewEncargoForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary">
        + Nuevo encargo
      </button>
    );
  }
  return <EncargoForm onDone={() => setOpen(false)} onCancel={() => setOpen(false)} />;
}
