// Envío de emails transaccionales vía Resend (https://resend.com).
// Se activa sólo si RESEND_API_KEY está configurado; si no, no-op seguro.

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

export function isEmailEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail({ to, subject, html }: SendArgs): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  // "from" verificado del dominio, o el remitente de pruebas de Resend.
  const from = process.env.EMAIL_FROM || 'Casaca de Cancha <onboarding@resend.dev>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
