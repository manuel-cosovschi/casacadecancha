import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AuctionLive } from './AuctionLive';
import { getAuctionState } from './actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const s = await getAuctionState(slug);
  return {
    title: s ? `Subasta: ${s.title}` : 'Subasta',
    description: s?.description || 'Subastá tu camiseta en vivo con Casaca de Cancha.',
  };
}

export default async function SubastaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const state = await getAuctionState(slug);
  if (!state) notFound();

  return (
    <div className="container-page py-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="kicker">Subasta en vivo</p>
        <Link href={`/subasta/${slug}/vivo`} className="text-xs font-semibold text-navy/50 hover:text-navy hover:underline">
          Ver en pantalla completa ↗
        </Link>
      </div>
      <AuctionLive initial={state} slug={slug} />
    </div>
  );
}
