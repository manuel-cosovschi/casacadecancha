'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Franja de la promo de línea.
 *
 * Anuncia la promo puntual (no la del catálogo entero, que tiene su propia
 * franja roja) y lleva al listado. Va en dorado sobre navy para que no compita
 * con la barra de anuncios ni con la promo general si algún día conviven.
 */
function faltan(endsAt: number): string {
  const ms = endsAt - Date.now();
  if (ms <= 0) return '';
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function PromoLineaStrip({
  label,
  price,
  comparePrice,
  endsAt,
  until,
  href = '/camisetas',
}: {
  label: string;
  price: number;
  comparePrice: number;
  endsAt: string;
  until: string;
  href?: string;
}) {
  const ends = Date.parse(endsAt);
  const [left, setLeft] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(ends)) return;
    const tick = () => setLeft(faltan(ends));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [ends]);

  const fmt = (n: number) => `$${n.toLocaleString('es-AR')}`;

  return (
    <Link
      href={href}
      className="block bg-navy text-cream transition hover:brightness-110"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-x-4 gap-y-1 px-4 py-3 text-center sm:flex-row sm:justify-center">
        <span className="text-lg font-black uppercase leading-none tracking-tight text-gold sm:text-xl">
          🏆 {label}
        </span>
        <span className="text-sm font-bold uppercase tracking-wide">
          Línea adidas Icon{' '}
          <span className="text-cream/50 line-through">{fmt(comparePrice)}</span>{' '}
          <span className="text-gold">{fmt(price)}</span>
        </span>
        <span className="rounded-full bg-cream/15 px-3 py-1 text-xs font-bold uppercase tracking-wide">
          {left ? `Termina en ${left}` : `Hasta el ${until}`}
        </span>
      </div>
    </Link>
  );
}
