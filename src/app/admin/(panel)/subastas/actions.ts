'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertWriter, logActivity } from '@/lib/admin/actions-helpers';
import { getCurrentProfile } from '@/lib/admin/auth';
import { slugify } from '@/lib/utils';
import { sendAdminPush } from '@/lib/push';

type Result = { ok?: boolean; error?: string; slug?: string };

async function guard(): Promise<Result | null> {
  try {
    await assertWriter();
    return null;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export interface AuctionInput {
  title: string;
  description?: string;
  image_url?: string;
  size?: string;
  start_price: number;
  min_increment: number;
  max_bid?: number | null;
  ends_at: string; // datetime-local
  anti_snipe_seconds?: number;
}

/** Crea la subasta en borrador (se publica con "Arrancar"). */
export async function createAuction(input: AuctionInput): Promise<Result> {
  const g = await guard();
  if (g) return g;

  const title = (input.title || '').trim();
  if (title.length < 3) return { error: 'Poné un título.' };
  const start = Math.max(0, Math.round(Number(input.start_price) || 0));
  if (start <= 0) return { error: 'Ingresá el precio base.' };
  const inc = Math.max(1, Math.round(Number(input.min_increment) || 1000));
  if (!input.ends_at) return { error: 'Elegí cuándo termina.' };
  const ends = new Date(input.ends_at);
  if (Number.isNaN(ends.getTime()) || ends.getTime() <= Date.now()) {
    return { error: 'La fecha de cierre tiene que ser futura.' };
  }

  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const base = slugify(title).slice(0, 40) || 'subasta';
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await supabase.from('auctions').insert({
    slug,
    title,
    description: (input.description || '').trim() || null,
    image_url: (input.image_url || '').trim() || null,
    size: (input.size || '').trim() || null,
    start_price: start,
    min_increment: inc,
    max_bid: input.max_bid ? Math.round(Number(input.max_bid)) : null,
    anti_snipe_seconds: Math.max(0, Math.round(Number(input.anti_snipe_seconds) || 120)),
    ends_at: ends.toISOString(),
    status: 'borrador',
    seller_id: profile?.id ?? null,
  });
  if (error) return { error: error.message };

  await logActivity('create', 'auction', slug, { title, start });
  revalidatePath('/admin/subastas');
  return { ok: true, slug };
}

/** Cambia el estado: arrancar, finalizar a mano o cancelar. */
export async function setAuctionStatus(
  id: string,
  status: 'borrador' | 'activa' | 'finalizada' | 'cancelada',
): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();

  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };

  if (status === 'finalizada') {
    // Al cerrar a mano, dejamos marcado el ganador.
    const { data: top } = await supabase
      .from('auction_bids')
      .select('id')
      .eq('auction_id', id)
      .eq('voided', false)
      .order('amount', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);
    patch.winner_bid_id = top?.[0]?.id ?? null;
    patch.ends_at = new Date().toISOString();
  }

  const { error } = await supabase.from('auctions').update(patch).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/subastas');
  return { ok: true };
}

/** Estira el cierre unos minutos (útil si hay pelea sobre la hora). */
export async function extendAuction(id: string, minutes: number): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { data: a } = await supabase.from('auctions').select('ends_at').eq('id', id).maybeSingle();
  if (!a) return { error: 'No se encontró la subasta.' };
  const base = Math.max(Date.now(), new Date(a.ends_at).getTime());
  const { error } = await supabase
    .from('auctions')
    .update({ ends_at: new Date(base + minutes * 60_000).toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/subastas');
  return { ok: true };
}

export async function deleteAuction(id: string): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { error } = await supabase.from('auctions').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/subastas');
  return { ok: true };
}

/** Habilita, deja pendiente o bloquea a un postor. */
export async function setBidderStatus(
  id: string,
  status: 'pendiente' | 'aprobado' | 'bloqueado',
): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { error } = await supabase
    .from('auction_bidders')
    .update({ status, approved_at: status === 'aprobado' ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) return { error: error.message };
  await logActivity('update', 'auction_bidder', id, { status });
  revalidatePath('/admin/subastas');
  return { ok: true };
}

/** Anula una puja (y opcionalmente bloquea a quien la hizo). */
export async function voidBid(id: string, alsoBlock: boolean): Promise<Result> {
  const g = await guard();
  if (g) return g;
  const supabase = await createClient();
  const { data: bid } = await supabase
    .from('auction_bids')
    .select('bidder_id')
    .eq('id', id)
    .maybeSingle();
  const { error } = await supabase.from('auction_bids').update({ voided: true }).eq('id', id);
  if (error) return { error: error.message };
  if (alsoBlock && bid?.bidder_id) {
    await supabase.from('auction_bidders').update({ status: 'bloqueado' }).eq('id', bid.bidder_id);
  }
  await logActivity('void', 'auction_bid', id, { blocked: alsoBlock });
  revalidatePath('/admin/subastas');
  return { ok: true };
}

/** Aviso al dueño de que hay alguien esperando aprobación. */
export async function notifyPendingBidders(count: number): Promise<void> {
  if (count <= 0) return;
  await sendAdminPush(
    `🙋 ${count} ${count === 1 ? 'persona quiere' : 'personas quieren'} pujar`,
    'Entrá a Subastas para habilitarlas.',
    '/admin/subastas',
    'cdc-subasta-postores',
  );
}
