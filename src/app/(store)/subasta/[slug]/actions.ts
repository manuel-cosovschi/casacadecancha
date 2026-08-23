'use server';

import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { BIDDER_COOKIE, type AuctionState } from '@/lib/auctions';

/** Mensaje de error legible (Postgres devuelve el raise exception con prefijo). */
function clean(msg: string): string {
  return msg.replace(/^.*?:\s*/, '').trim() || 'No se pudo completar la acción.';
}

/** Estado actual de la subasta (lo llama la página y el polling). */
export async function getAuctionState(slug: string): Promise<AuctionState | null> {
  try {
    const supabase = await createClient();
    const token = (await cookies()).get(BIDDER_COOKIE)?.value ?? null;
    const { data, error } = await supabase.rpc('auction_state', {
      p_slug: slug,
      p_token: token,
    });
    if (error || !data) return null;
    return data as AuctionState;
  } catch {
    return null;
  }
}

/** Registra al postor. Si ya te compró, queda aprobado al instante. */
export async function registerBidder(
  name: string,
  phone: string,
): Promise<{ ok?: boolean; status?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('auction_register_bidder', {
      p_name: name,
      p_phone: phone,
    });
    if (error) return { error: clean(error.message) };
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.token) return { error: 'No se pudo registrar.' };

    (await cookies()).set(BIDDER_COOKIE, row.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 180,
      path: '/',
    });
    return { ok: true, status: row.status };
  } catch (e) {
    return { error: clean((e as Error).message) };
  }
}

/** Puja. Toda la validación real ocurre en la base. */
export async function placeBid(
  slug: string,
  amount: number,
): Promise<{ ok?: boolean; state?: AuctionState; error?: string }> {
  try {
    const token = (await cookies()).get(BIDDER_COOKIE)?.value;
    if (!token) return { error: 'Registrate para poder pujar.' };
    const h = await headers();
    const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() || null;

    const supabase = await createClient();
    const { data, error } = await supabase.rpc('auction_place_bid', {
      p_slug: slug,
      p_token: token,
      p_amount: Math.round(Number(amount) || 0),
      p_ip: ip,
    });
    if (error) return { error: clean(error.message) };
    return { ok: true, state: data as AuctionState };
  } catch (e) {
    return { error: clean((e as Error).message) };
  }
}
