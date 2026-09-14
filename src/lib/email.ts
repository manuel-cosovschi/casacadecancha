// Envío de emails transaccionales vía Resend (https://resend.com).
// Se activa sólo si RESEND_API_KEY está configurado; si no, no-op seguro.

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

export interface SendResult {
  ok: boolean;
  /** Qué contestó Resend cuando rechazó. Vacío si salió bien. */
  error?: string;
}

export function isEmailEnabled() {
  return Boolean(process.env.RESEND_API_KEY);
}

/** El remitente configurado, o el de pruebas de Resend. */
export function emailFrom(): string {
  return process.env.EMAIL_FROM || 'Casaca de Cancha <onboarding@resend.dev>';
}

/**
 * ¿Estamos mandando desde el remitente de pruebas de Resend?
 *
 * Importa mucho: `onboarding@resend.dev` SOLO entrega al mail con el que se
 * creó la cuenta de Resend. Los avisos al dueño llegan y los de los clientes
 * los rechaza, que por fuera se ve igual que "la gente no compra".
 */
export function usingTestSender(): boolean {
  return emailFrom().includes('onboarding@resend.dev');
}

/**
 * Manda el mail y devuelve QUÉ pasó, no solo si salió.
 *
 * Antes devolvía un booleano y se tragaba el motivo. Un rechazo de Resend
 * quedaba indistinguible de un éxito en los logs, y del lado del negocio se
 * veía como gente que se suscribe y no compra.
 */
export async function sendEmailDetailed({ to, subject, html }: SendArgs): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: 'Falta RESEND_API_KEY' };
  if (!to) return { ok: false, error: 'Sin destinatario' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ from: emailFrom(), to, subject, html }),
    });

    if (res.ok) return { ok: true };

    const detalle = await res.text().catch(() => '');
    const error = `Resend ${res.status}: ${detalle.slice(0, 300)}`;
    console.error(`[email] rechazado para ${to} — ${error}`);
    return { ok: false, error };
  } catch (e) {
    const error = `No se pudo contactar a Resend: ${String(e).slice(0, 200)}`;
    console.error(`[email] ${error}`);
    return { ok: false, error };
  }
}

/** Igual que `sendEmailDetailed`, para quien solo necesita saber si salió. */
export async function sendEmail(args: SendArgs): Promise<boolean> {
  return (await sendEmailDetailed(args)).ok;
}

/** El dominio del remitente configurado (lo de después del @). */
export function fromDomain(): string | null {
  const m = emailFrom().match(/@([^\s>@]+)/);
  return m ? m[1].toLowerCase() : null;
}

export interface DominioResend {
  nombre: string;
  /** 'verified', 'pending', 'not_started', 'failed'… tal cual lo dice Resend. */
  estado: string;
}

export interface EstadoDominios {
  /** null = no se pudo consultar (sin key, o Resend no contestó). */
  verificados: DominioResend[] | null;
  error?: string;
}

/**
 * Qué dominios tiene verificados la cuenta de Resend.
 *
 * Es la única fuente que dice la verdad sobre si los mails a clientes salen.
 * Sin un dominio verificado, Resend solo acepta `onboarding@resend.dev`, y ese
 * remitente entrega ÚNICAMENTE a la casilla dueña de la cuenta: los avisos al
 * dueño llegan, los códigos de los clientes se rechazan, y desde afuera se ve
 * igual que "la gente se suscribe y no compra".
 */
export async function listarDominios(): Promise<EstadoDominios> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { verificados: null, error: 'Falta RESEND_API_KEY' };

  try {
    const res = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!res.ok) {
      return { verificados: null, error: `Resend ${res.status}` };
    }
    const json = (await res.json()) as { data?: { name?: string; status?: string }[] };
    return {
      verificados: (json.data ?? []).map((d) => ({
        nombre: String(d.name ?? ''),
        estado: String(d.status ?? 'desconocido'),
      })),
    };
  } catch (e) {
    return { verificados: null, error: `No se pudo consultar: ${String(e).slice(0, 120)}` };
  }
}
