'use client';

import { useState } from 'react';

interface Row {
  product: string;
  size: string | null;
  available: number;
}

const TRIGGERS = ['queda', 'tengo', 'stock', 'disponible', 'hay', 'que me', 'qué me'];

export function StockBot({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

  function respond(question: string) {
    const text = question.toLowerCase();
    const matches = TRIGGERS.some((t) => text.includes(t)) || text.trim() === '';
    if (!matches) {
      setAnswer('No entendí 🤔. Probá preguntando: "¿Qué me queda?"');
      return;
    }
    const withStock = rows.filter((r) => r.available > 0);
    if (withStock.length === 0) {
      setAnswer('No te queda stock disponible de ningún modelo/talle. 🙁');
      return;
    }
    // Agrupar por producto
    const byProduct = new Map<string, { size: string; qty: number }[]>();
    for (const r of withStock) {
      const list = byProduct.get(r.product) || [];
      list.push({ size: r.size || '—', qty: r.available });
      byProduct.set(r.product, list);
    }
    const lines: string[] = ['Te queda:'];
    for (const [product, sizes] of byProduct) {
      const parts = sizes.map((s) => `${s.size}: ${s.qty}`).join(' · ');
      lines.push(`• ${product} → ${parts}`);
    }
    const total = withStock.reduce((a, r) => a + r.available, 0);
    lines.push(`Total: ${total} unidad${total === 1 ? '' : 'es'}.`);
    setAnswer(lines.join('\n'));
  }

  return (
    <div className="card mb-5 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Consultá tu stock</h2>
      <p className="mb-3 text-xs text-navy/50">
        Preguntá rápido para responderle a un cliente. Ej: <em>“¿Qué me queda?”</em>
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          respond(q);
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="¿Qué me queda?"
          className="input flex-1"
        />
        <button type="submit" className="btn-primary">Preguntar</button>
      </form>

      {answer && (
        <div className="mt-3 rounded-xl bg-cream-soft p-3">
          <pre className="whitespace-pre-wrap font-sans text-sm text-navy">{answer}</pre>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(answer)}
            className="mt-2 text-xs font-semibold text-navy underline"
          >
            Copiar
          </button>
        </div>
      )}
    </div>
  );
}
