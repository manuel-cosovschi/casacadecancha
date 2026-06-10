'use server';

import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/**
 * El cliente sube su comprobante de transferencia. Se guarda en Storage,
 * el pedido pasa a "en revisión" y se notifica al administrador por email.
 */
export async function submitTransferProof(
  formData: FormData,
): Promise<{ ok?: boolean; error?: string }> {
  const orderNumber = formData.get('orderNumber')?.toString();
  const file = formData.get('file') as File | null;

  if (!orderNumber) return { error: 'Pedido inválido.' };
  if (!file || file.size === 0) return { error: 'Seleccioná un archivo.' };
  if (file.size > MAX_BYTES) return { error: 'El archivo supera los 8 MB.' };
  if (!ALLOWED.includes(file.type)) {
    return { error: 'Formato no válido. Subí una imagen (JPG/PNG) o PDF.' };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { error: 'No se pudo procesar el comprobante.' };
  }

  // Verificar que el pedido exista (vía RPC pública).
  const { data: order } = await supabase.rpc('storefront_get_order', {
    p_order_number: orderNumber,
  });
  if (!order) return { error: 'Pedido no encontrado.' };

  // Subir a Storage (bucket privado; policy permite insert a anon).
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${orderNumber}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('comprobantes')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return { error: 'No se pudo subir el comprobante. Intentá de nuevo.' };

  // Marcar el pedido "en revisión" y guardar la referencia del comprobante.
  const { error: rpcErr } = await supabase.rpc('submit_transfer_proof', {
    p_order_number: orderNumber,
    p_proof_url: path,
  });
  if (rpcErr) return { error: 'No se pudo registrar el comprobante.' };

  // Notificar al administrador por email (si está configurado Resend).
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      subject: `🧾 Comprobante recibido — Pedido #${orderNumber}`,
      html: `
        <div style="font-family:system-ui,sans-serif;color:#0B1F3A">
          <h2>Nuevo comprobante de transferencia</h2>
          <p>El cliente subió un comprobante para el pedido <strong>#${orderNumber}</strong>.</p>
          <p>Total del pedido: <strong>$${Number(order.total).toLocaleString('es-AR')}</strong></p>
          <p>Cliente: ${order.customer_name || ''} — ${order.customer_phone || ''}</p>
          <p>Revisá el comprobante y aprobá el pago desde el panel:</p>
          <p><a href="${SITE_URL}/admin/pedidos/${orderNumber}"
                style="background:#0B1F3A;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">
             Ver pedido en el dashboard</a></p>
          <p style="color:#64748b;font-size:13px">Una vez que confirmes que el dinero llegó, marcá el pago como “Pagado”.</p>
        </div>`,
    });
  }

  return { ok: true };
}
