'use server';

import { requireAdmin } from '@/lib/admin/auth';
import {
  sendEmailDetailed,
  isEmailEnabled,
  emailFrom,
  fromDomain,
  usingTestSender,
  listarDominios,
  type DominioResend,
} from '@/lib/email';
import { personalCode } from '@/lib/welcome';
import { proveedor, modelo, probarIa } from '@/lib/ai';

export interface EstadoEmail {
  /** ¿Hay RESEND_API_KEY? */
  activo: boolean;
  /** Desde qué dirección sale. */
  remitente: string;
  /** true si es el remitente de pruebas de Resend. */
  remitenteDePrueba: boolean;
  /** El dominio del remitente, para los carteles. */
  dominio: string | null;
  /**
   * ¿Resend tiene verificado el dominio del remitente?
   * null = no se pudo preguntar (sin key, o Resend no contestó).
   */
  dominioVerificado: boolean | null;
  /** Todos los dominios de la cuenta, con su estado, para saber qué falta. */
  dominios: DominioResend[] | null;
  /** Por qué no se pudo consultar, si no se pudo. */
  errorDominios?: string;
  /** ¿Se pueden firmar los códigos de descuento? */
  puedeFirmarCodigos: boolean;
  /** ¿Hay a quién avisarle? */
  avisoConfigurado: boolean;
}

/**
 * Estado del envío de mails, para ver de un vistazo si el sistema puede
 * entregarle el descuento a un cliente.
 *
 * No alcanza con mirar la configuración: un EMAIL_FROM con dominio propio se ve
 * perfecto y Resend igual lo rechaza si ese dominio no está verificado. Por eso
 * se le pregunta a Resend, que es el único que sabe.
 */
export async function estadoEmail(): Promise<EstadoEmail> {
  await requireAdmin();

  const dominio = fromDomain();
  const { verificados, error } = await listarDominios();

  return {
    activo: isEmailEnabled(),
    remitente: emailFrom(),
    remitenteDePrueba: usingTestSender(),
    dominio,
    dominioVerificado:
      verificados === null || !dominio
        ? null
        : verificados.some((d) => d.nombre.toLowerCase() === dominio && d.estado === 'verified'),
    dominios: verificados,
    errorDominios: error,
    puedeFirmarCodigos: personalCode('prueba@ejemplo.com') !== null,
    avisoConfigurado: Boolean(process.env.ADMIN_EMAIL),
  };
}

export interface ResultadoPrueba {
  ok: boolean;
  mensaje: string;
}

/**
 * Manda un mail de prueba a la dirección que se le pase.
 *
 * Mandarlo a una dirección de AFUERA es el único chequeo que sirve: al mail
 * propio llega igual aunque el remitente esté sin verificar.
 */
export async function mandarMailDePrueba(destino: string): Promise<ResultadoPrueba> {
  await requireAdmin();

  const to = (destino || '').trim().toLowerCase();
  if (!to.includes('@') || !to.includes('.')) {
    return { ok: false, mensaje: 'Escribí una dirección válida.' };
  }
  if (!isEmailEnabled()) {
    return { ok: false, mensaje: 'Falta RESEND_API_KEY en las variables de entorno.' };
  }

  const res = await sendEmailDetailed({
    to,
    subject: 'Prueba de envío — Casaca de Cancha',
    html: `<div style="font-family:system-ui,sans-serif;color:#0B1F3A;max-width:520px">
      <h2>Llegó 👍</h2>
      <p>Si estás viendo esto, el sistema puede mandarle mails a tus clientes.</p>
      <p style="color:#888;font-size:12px">Enviado desde ${emailFrom()}</p>
    </div>`,
  });

  if (res.ok) {
    return {
      ok: true,
      mensaje: `Enviado a ${to}. Si no aparece en unos minutos, revisá spam.`,
    };
  }

  const extra = usingTestSender()
    ? ' Estás mandando desde onboarding@resend.dev, que solo entrega a tu propio mail. Verificá el dominio en Resend y configurá EMAIL_FROM.'
    : '';
  return { ok: false, mensaje: `No salió. ${res.error || ''}${extra}` };
}

export interface EstadoIa {
  /** ¿Hay alguna key cargada? */
  activo: boolean;
  /** Cuál está en uso. */
  proveedor: 'anthropic' | 'openai' | null;
  /** Qué modelo va a pedir. */
  modelo: string | null;
  /** ¿Están cargadas las dos? (manda Claude salvo que AI_PROVIDER diga otra cosa) */
  ambas: boolean;
}

/** Qué IA está configurada, sin llamar a nadie. */
export async function estadoIa(): Promise<EstadoIa> {
  await requireAdmin();
  const p = proveedor();
  return {
    activo: p !== null,
    proveedor: p,
    modelo: p ? modelo(p) : null,
    ambas: Boolean(process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY),
  };
}

/**
 * Le pide al modelo una respuesta mínima para ver si la key sirve de verdad.
 *
 * Que la variable esté cargada no quiere decir nada: puede estar vencida, sin
 * saldo, o apuntando a un modelo que no existe. Esto lo dice de verdad.
 */
export async function probarIaAction(): Promise<ResultadoPrueba> {
  await requireAdmin();
  const r = await probarIa();
  return { ok: r.ok, mensaje: r.detalle };
}
