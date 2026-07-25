import 'server-only';

/** Número a formato internacional para la API de WhatsApp (AR mobile: 549 + área + número). */
function toWhatsAppNumber(phone: string): string {
  let p = (phone || '').replace(/\D/g, '');
  if (p.startsWith('54')) {
    p = p.slice(2);
    if (p.startsWith('9')) p = p.slice(1);
  }
  if (p.startsWith('0')) p = p.slice(1);
  // Quitar el 15 de celular si viene como área+15+número no aplica genéricamente; asumimos área+número.
  return p.length === 10 ? `549${p}` : `54${p}`;
}

/**
 * Envía un mensaje de texto por la API de WhatsApp Business (Meta Cloud API).
 * No-op seguro si no está configurada (WHATSAPP_TOKEN + WHATSAPP_PHONE_ID).
 * Nota: fuera de la ventana de 24 hs, Meta exige plantilla aprobada; esto envía texto libre.
 */
export async function sendWhatsAppText(phone: string, body: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId || !phone) return false;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toWhatsAppNumber(phone),
        type: 'text',
        text: { body, preview_url: true },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function isWhatsAppEnabled() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
}
