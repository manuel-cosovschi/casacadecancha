'use client';

import { LOYALTY, FIRST_TIER_PERCENT, HIGHER_TIER_PERCENTS } from '@/lib/loyalty-tiers';
import { formatPrice } from '@/lib/utils';

/**
 * Barra de progreso del carrito hacia el descuento de cliente.
 *
 * A medida que la persona suma camisetas, ve cuánto le falta para que esa
 * compra cuente para el programa de fidelidad y qué gana cuando llega.
 *
 * El umbral se mide sobre el SUBTOTAL, que es exactamente el mismo criterio
 * que usa la base para contar la compra (`loyalty_qualifying_orders`). Si acá
 * midiéramos el total con descuentos, la barra prometería algo distinto de lo
 * que después pasa.
 *
 * Sobre el porcentaje que se muestra: quien ya es cliente puede tener 15% o
 * 20%, pero desde el carrito no sabemos quién es —no hay mail todavía—, así
 * que se anuncia el escalón más bajo. Quedarse corto es preferible: el
 * checkout le va a mostrar el número real, y va a ser igual o mejor.
 */
export function CartProgress({
  subtotal,
  className = '',
}: {
  subtotal: number;
  className?: string;
}) {
  if (!LOYALTY.active || subtotal <= 0) return null;

  const meta = LOYALTY.minOrderAmount;
  const falta = Math.max(0, meta - subtotal);
  const llego = falta === 0;
  const pct = Math.min(100, Math.round((subtotal / meta) * 100));

  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        llego ? 'border-green-600/25 bg-green-50' : 'border-navy/10 bg-navy/[0.03]'
      } ${className}`}
    >
      <p className={`text-sm font-bold ${llego ? 'text-green-800' : 'text-navy'}`}>
        {llego ? (
          <>🎉 ¡Listo! Esta compra te deja {FIRST_TIER_PERCENT}% OFF para la próxima</>
        ) : (
          <>
            🎁 Te faltan <span className="tabular-nums">{formatPrice(falta)}</span> para{' '}
            {FIRST_TIER_PERCENT}% OFF en tu próxima compra
          </>
        )}
      </p>

      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-navy/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso hacia el descuento de cliente"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${
            llego ? 'bg-green-600' : 'bg-celeste'
          }`}
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>

      <p className={`mt-1.5 text-[11px] leading-relaxed ${llego ? 'text-green-800/75' : 'text-navy/50'}`}>
        {llego ? (
          HIGHER_TIER_PERCENTS.length > 0 ? (
            <>
              Y comprando de nuevo subís a{' '}
              {HIGHER_TIER_PERCENTS.map((p) => `${p}%`).join(', y después a ')}.
            </>
          ) : null
        ) : (
          <>
            <span className="tabular-nums">{formatPrice(subtotal)}</span> de{' '}
            <span className="tabular-nums">{formatPrice(meta)}</span> · las compras de más de{' '}
            {formatPrice(meta)} suman a tu descuento de cliente.
          </>
        )}
      </p>
    </div>
  );
}
