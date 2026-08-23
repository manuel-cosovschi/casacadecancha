/** Tipos y constantes compartidas de las subastas (sin 'use server'). */

export const BIDDER_COOKIE = 'cdc_postor';

export interface AuctionState {
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  size: string | null;
  status: 'activa' | 'finalizada';
  start_price: number;
  min_increment: number;
  max_bid: number | null;
  ends_at: string;
  server_now: string;
  current_price: number;
  has_bids: boolean;
  next_min: number;
  bid_count: number;
  bids: { amount: number; created_at: string; who: string }[];
  winner: string | null;
  me: { name: string; status: 'pendiente' | 'aprobado' | 'bloqueado'; is_top: boolean } | null;
}
