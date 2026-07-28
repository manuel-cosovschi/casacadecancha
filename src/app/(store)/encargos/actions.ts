'use server';

import { createClient } from '@/lib/supabase/server';
import { encargoRequestSchema, type EncargoRequestInput } from '@/lib/validation';
import { sendEncargoPush } from '@/lib/push';
import { sendEmail } from '@/lib/email';

interface EncargoActionResult {
  ok: boolean;
  requestNumber?: string;
  error?: string;
}

/**
 * Registra un encargo a pedido armado por el cliente (queda "pendiente" para
 * que el dueño lo cotice y apruebe/rechace desde el admin).
 */
export async function createEncargoRequest(
  input: EncargoRequestInput,
): Promise<EncargoActionResult> {
  const parsed = encargoRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' };
  }
  const data = parsed.data;

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, error: 'El sistema de encargos no está disponible.' };
  }

  const payload = {
    customer_name: data.customer_name.trim(),
    customer_phone: data.customer_phone.trim(),
    customer_email: (data.customer_email || '').trim(),
    dni: (data.dni || '').trim(),
    delivery_method: data.delivery_method,
    province: (data.province || '').trim(),
    city: (data.city || '').trim(),
    address: (data.address || '').trim(),
    postal_code: (data.postal_code || '').trim(),
    notes: (data.notes || '').trim(),
    items: data.items.map((i) => ({
      product: i.product.trim(),
      size: i.size.trim(),
      quantity: i.quantity,
    })),
  };

  const { data: requestNumber, error } = await supabase.rpc(
    'storefront_create_encargo_request',
    { p: payload },
  );

  if (error || !requestNumber) {
    return { ok: false, error: 'No se pudo enviar el encargo. Intentá de nuevo.' };
  }

  // Aviso al dueño (push + email). Best-effort.
  const num = requestNumber as string;
  const totalQty = payload.items.reduce((a, i) => a + i.quantity, 0);
  try {
    await sendEncargoPush(num, totalQty);
  } catch {
    /* no-op */
  }
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    const rows = payload.items
      .map((i) => `<li>${i.quantity}x ${i.product} (talle ${i.size})</li>`)
      .join('');
    await sendEmail({
      to: adminEmail,
      subject: `🧵 Nuevo encargo a cotizar #${num}`,
      html: `<div style="font-family:system-ui,sans-serif;color:#0B1F3A">
        <h2>Nuevo encargo #${num}</h2>
        <p>${payload.customer_name} — ${payload.customer_phone}</p>
        <p>${totalQty} prenda(s) · ${data.delivery_method === 'envio' ? 'Con envío' : 'Retiro'}</p>
        <ul>${rows}</ul>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/admin/encargos-web"
              style="background:#0B1F3A;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
           Ver y cotizar</a></p>
      </div>`,
    });
  }

  return { ok: true, requestNumber: num };
}
