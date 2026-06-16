'use client';

import { useState } from 'react';

interface Row {
  product: string;
  size: string | null;
  available: number;
}

interface IncomingRow {
  product: string;
  size: string | null;
  inTransit: number;
  leftover: number;
}

const TRIGGERS = ['queda', 'tengo', 'stock', 'disponible', 'hay', 'que me', 'qué me', 'camino', 'llega'];

export function StockBot({ rows, incoming = [] }: { rows: Row[]; incoming?: IncomingRow[] }) {
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
    const lines: string[] = [];

    // Stock disponible ahora
    if (withStock.length === 0) {
      lines.push('Ahora no te queda stock disponible de ningún modelo/talle. 🙁');
    } else {
      const byProduct = new Map<string, { size: string; qty: number }[]>();
      for (const r of withStock) {
        const list = byProduct.get(r.product) || [];
        list.push({ size: r.size || '—', qty: r.available });
        byProduct.set(r.product, list);
      }
      lines.push('Te queda ahora:');
      for (const [product, sizes] of byProduct) {
        lines.push(`• ${product} → ${sizes.map((s) => `${s.size}: ${s.qty}`).join(' · ')}`);
      }
      const total = withStock.reduce((a, r) => a + r.available, 0);
      lines.push(`Total disponible: ${total} unidad${total === 1 ? '' : 'es'}.`);
    }

    // Stock en camino (pedidos al proveedor sin recibir)
    const incomingRows = incoming.filter((r) => r.inTransit > 0);
    if (incomingRows.length > 0) {
      const byProduct = new Map<string, { size: string; inTransit: number; leftover: number }[]>();
      for (const r of incomingRows) {
        const list = byProduct.get(r.product) || [];
        list.push({ size: r.size || '—', inTransit: r.inTransit, leftover: r.leftover });
        byProduct.set(r.product, list);
      }
      lines.push('', '🚚 En camino (todavía NO llegó):');
      for (const [product, sizes] of byProduct) {
        const parts = sizes
          .map((s) => `${s.size}: +${s.inTransit}${s.leftover !== s.inTransit ? ` (te quedarían ${s.leftover})` : ''}`)
          .join(' · ');
        lines.push(`• ${product} → ${parts}`);
      }
      const totalIn = incomingRows.reduce((a, r) => a + r.inTransit, 0);
      const totalLeft = incomingRows.reduce((a, r) => a + r.leftover, 0);
      lines.push(`Cuando llegue el pedido vas a sumar ${totalIn} u. y te quedarían ${totalLeft} libres en total.`);
    }

    if (lines.length === 0) lines.push('No tenés stock ni pedidos en camino. 🙁');
    setAnswer(lines.join('\n'));
  }

  return (
    <div className="card mb-5 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Consultá tu stock</h2>
      <p className="mb-3 text-xs text-navy/50">
        Preguntá rápido para responderle a un cliente. Ej: <em>“¿Qué me queda?”</em> Te muestra el stock disponible
        ahora y lo que tenés en camino del proveedor (todavía sin llegar).
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
