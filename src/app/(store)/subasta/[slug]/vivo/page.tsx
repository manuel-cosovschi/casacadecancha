import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAuctionState } from '../actions';
import { BroadcastView } from './BroadcastView';

export const metadata: Metadata = { title: 'Subasta en vivo', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function VivoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const state = await getAuctionState(slug);
  if (!state) notFound();
  return <BroadcastView initial={state} slug={slug} />;
}
