'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  size: z.string().nullable().optional(),
  email: z.string().email('Email inválido'),
  phone: z.string().optional().nullable(),
});

/** El cliente pide que le avisen cuando vuelva el stock de un talle. */
export async function subscribeStock(input: {
  productId: string;
  variantId?: string | null;
  size?: string | null;
  email: string;
  phone?: string | null;
}): Promise<{ ok?: boolean; error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Datos inválidos.' };
  }
  const d = parsed.data;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('stock_notifications').insert({
      product_id: d.productId,
      variant_id: d.variantId || null,
      size: d.size || null,
      email: d.email.toLowerCase().trim(),
      phone: d.phone || null,
    });
    if (error) return { error: 'No se pudo registrar. Probá de nuevo.' };
    return { ok: true };
  } catch {
    return { error: 'No se pudo registrar.' };
  }
}
