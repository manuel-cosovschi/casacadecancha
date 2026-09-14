'use client';

import { useState } from 'react';
import type { ItemPresupuesto } from '@/lib/presupuesto';
import { formatPrice, whatsappLink } from '@/lib/utils';

/**
 * El texto del presupuesto para pegar en WhatsApp.
 *
 * El PDF es el adjunto, pero el mensaje que lo acompaña también hay que
 * escribirlo, y siempre es el mismo. Acá sale armado: si hay teléfono, abre el
 * chat directamente; si no, se copia.
 *
 * No se imprime: es parte del panel, no del papel.
 */
export function MandarPorWhatsApp({
  numero,
  cliente,
  contacto,
  total,
  sena,
  senaPct,
  items,
  vence,
}: {
  numero: string;
  cliente: string;
  contacto: string | null;
  total: number;
  sena: number;
  senaPct: number;
  items: ItemPresupuesto[];
  vence: string;
}) {
  const [copiado, setCopiado] = useState(false);

  const nombre = cliente.trim().split(/\s+/)[0] || '';
  const lineas = items
    .map((i) => {
      const cant = Math.max(1, Number(i.cantidad) || 1);
      return `• ${cant > 1 ? `${cant}x ` : ''}${i.nombre} — ${formatPrice(Number(i.precio) * cant)}`;
    })
    .join('\n');

  const texto = [
    `¡Hola${nombre ? ` ${nombre}` : ''}! Te paso el presupuesto ${numero} 👇`,
    '',
    lineas,
    '',
    `*Total: ${formatPrice(total)}*`,
    `Seña ${senaPct}% para reservar: ${formatPrice(sena)}`,
    `El saldo lo abonás al recibirlo.`,
    '',
    `Vale hasta el ${vence}. Te mando el detalle en PDF.`,
  ].join('\n');

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="mx-auto mb-4 max-w-[820px] px-4 print:hidden">
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <span className="text-sm text-navy/60">Mensaje para acompañar el PDF:</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button onClick={copiar} className="rounded-full border border-navy/15 px-4 py-2 text-sm font-semibold text-navy transition hover:bg-navy/5">
            {copiado ? '✓ Copiado' : 'Copiar mensaje'}
          </button>
          {contacto && (
            <a
              href={whatsappLink(contacto, texto)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white transition hover:brightness-95"
            >
              Abrir WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
