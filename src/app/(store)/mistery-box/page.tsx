import type { Metadata } from 'next';
import { ProductGrid } from '@/components/store/ProductGrid';
import { getMysteryBoxes } from '@/lib/queries';
import { getTransferDiscount } from '@/lib/store-helpers';

export const metadata: Metadata = {
  title: 'Mystery Box',
  description:
    'Comprá tu Mystery Box y recibí camisetas sorpresa. Elegís tu talle y, si tenés preferencias, aclarás qué equipos, selecciones o ligas no querés que te toquen.',
};

export const dynamic = 'force-dynamic';

export default async function MisteryBoxPage() {
  const [boxes, transferDiscount] = await Promise.all([
    getMysteryBoxes(),
    getTransferDiscount(),
  ]);

  return (
    <div>
      <section className="border-b border-navy/10 bg-cream-soft">
        <div className="container-page py-10 text-center">
          <p className="kicker">Sorpresa asegurada</p>
          <h1 className="mt-2 text-3xl font-extrabold uppercase text-navy sm:text-4xl">
            🎁 Mystery Box
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-navy/70">
            Elegí tu caja y te llegan camisetas <strong>100% aleatorias</strong> — puede tocarte
            cualquier equipo, selección o liga. Elegís tu <strong>talle</strong> y, si tenés
            preferencias, aclarás qué <strong>NO</strong> querés que te toque. Todas importadas,
            calidad jugador.
          </p>
          <div className="mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-center gap-2 text-xs font-semibold text-navy/70">
            <span className="chip">🐐 GOAT · 1 camiseta</span>
            <span className="chip">🏆 CHAMP · 4 camisetas</span>
            <span className="chip">👑 LEYEND · 7 camisetas</span>
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-navy/60">
            📦 Como la caja puede incluir camisetas que encargamos, la demora estimada es de{' '}
            <strong>5 a 7 días hábiles</strong> en Mar del Plata y <strong>7 a 14 días hábiles</strong>{' '}
            para envíos al resto del país.
          </p>
        </div>
      </section>

      {boxes.length > 0 ? (
        <ProductGrid
          title="Elegí tu Mystery Box"
          description="Cuantas más camisetas, mejor el precio por unidad."
          products={boxes}
          transferDiscount={transferDiscount}
        />
      ) : (
        <div className="container-page py-16 text-center text-navy/50">
          Pronto vas a poder comprar tu Mystery Box. ¡Volvé en un rato!
        </div>
      )}
    </div>
  );
}
