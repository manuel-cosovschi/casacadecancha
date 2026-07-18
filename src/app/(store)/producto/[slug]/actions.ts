'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sendAdminPush } from '@/lib/push';

const schema = z.object({
  productId: z.string().uuid(),
  productName: z.string().optional(),
  phone: z.string().min(6, 'Ingresá tu WhatsApp'),
  sizes: z
    .array(
      z.object({
        size: z.string().nullable(),
        variantId: z.string().uuid().nullable().optional(),
      }),
    )
    .min(1, 'Elegí al menos un talle'),
});

export type StockRequestInput = z.infer<typeof schema>;

/**
 * El cliente deja su WhatsApp y el/los talle(s) que busca de un producto sin stock.
 * Se guarda en stock_notifications y se avisa al admin por push.
 */
export async function requestStock(
  input: StockRequestInput,
): Promise<{ ok?: boolean; error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Datos inválidos.' };
  }
  const d = parsed.data;
  const phone = d.phone.trim();
  try {
    const supabase = await createClient();
    const rows = d.sizes.map((s) => ({
      product_id: d.productId,
      variant_id: s.variantId || null,
      size: s.size || null,
      phone,
    }));
    const { error } = await supabase.from('stock_notifications').insert(rows);
    if (error) return { error: 'No se pudo registrar. Probá de nuevo.' };

    // Aviso al admin (best-effort, no rompe la respuesta al cliente).
    try {
      const sizeList = d.sizes.map((s) => s.size || '-').join(', ');
      await sendAdminPush(
        '👀 Te buscan un producto sin stock',
        `${d.productName || 'Un producto'} · talle ${sizeList} · WhatsApp ${phone}`,
        '/admin/faltantes',
        'stock-req',
      );
    } catch {
      /* no-op */
    }
    return { ok: true };
  } catch {
    return { error: 'No se pudo registrar.' };
  }
}
