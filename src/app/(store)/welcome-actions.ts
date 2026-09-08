'use server';

import { createClient } from '@/lib/supabase/server';
import { sendEmail, isEmailEnabled } from '@/lib/email';
import { WELCOME, personalCode } from '@/lib/welcome';

export interface WelcomeResult {
  ok: boolean;
  message: string;
  /** true si además le llegó el mail con el código. */
  emailed?: boolean;
}

const BRAND = '#0B1F3A';

function welcomeEmailHtml(name: string, code: string) {
  const first = name.trim().split(/\s+/)[0] || '';
  return `<div style="font-family:system-ui,-apple-system,sans-serif;color:${BRAND};max-width:520px;margin:0 auto">
    <h1 style="font-size:22px;margin:0 0 6px">¡Bienvenido${first ? ` ${first}` : ''}!</h1>
    <p style="color:#444;line-height:1.6;margin:0 0 20px">
      Gracias por sumarte a Casaca de Cancha. Acá va tu descuento para la primera compra:
    </p>
    <div style="background:${BRAND};color:#fff;border-radius:16px;padding:24px;text-align:center">
      <p style="margin:0;font-size:11px;letter-spacing:2px;opacity:.75">TU CÓDIGO</p>
      <p style="margin:8px 0;font-size:30px;font-weight:800;letter-spacing:2px">${code}</p>
      <p style="margin:0;font-size:14px">${WELCOME.percent}% OFF en tu primera compra</p>
    </div>
    <p style="color:#444;line-height:1.6;margin:20px 0">
      Usalo al finalizar la compra, en el campo de cupón. Es personal: funciona
      solo con este mismo email y vence en 30 días.
    </p>
    <p style="margin:0 0 22px">
      <a href="https://casacadecancha.shop/camisetas"
         style="background:${BRAND};color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">
        Ver camisetas
      </a>
    </p>
    <p style="color:#888;font-size:12px;line-height:1.5;margin:0">
      El descuento vale una sola vez y solo en la primera compra. Somos de Mar del Plata
      y enviamos a todo el país.
    </p>
  </div>`;
}

/**
 * Alta desde el popup: guarda el suscriptor y le manda el código por mail.
 *
 * El alta se hace por RPC porque el storefront no puede escribir la tabla
 * directo. Si la RPC todavía no existe (migración 0031 sin aplicar), igual se
 * le avisa al dueño por mail para no perder el contacto, y se le dice al
 * cliente la verdad: que le vamos a escribir.
 */
export async function subscribeWelcome(
  nameRaw: string,
  emailRaw: string,
): Promise<WelcomeResult> {
  const name = (nameRaw || '').trim();
  const email = (emailRaw || '').trim().toLowerCase();

  if (name.length < 3 || !name.includes(' ')) {
    return { ok: false, message: 'Escribí tu nombre y apellido.' };
  }
  if (!email.includes('@') || !email.includes('.') || email.length < 6) {
    return { ok: false, message: 'Revisá el email, parece incompleto.' };
  }

  let stored = false;
  let alreadyBought = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('welcome_subscribe', {
      p_email: email,
      p_name: name,
    });
    if (!error && data) {
      stored = Boolean((data as any).ok);
      alreadyBought = (data as any).eligible === false;
    }
  } catch {
    /* la RPC todavía no existe: seguimos, el mail al dueño no se pierde */
  }

  // Aviso al dueño: mientras la tabla no exista, esta es la lista de contactos.
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && isEmailEnabled()) {
    await sendEmail({
      to: adminEmail,
      subject: `📩 Nuevo suscriptor: ${name}`,
      html: `<div style="font-family:system-ui,sans-serif;color:${BRAND}">
        <h2>Nuevo alta del popup</h2>
        <p><strong>${name}</strong><br>${email}</p>
        <p>${stored ? 'Guardado en welcome_signups.' : '<strong>NO se pudo guardar en la base</strong> (falta aplicar la migración 0031). Anotalo a mano.'}</p>
        ${alreadyBought ? '<p>Ojo: este email ya tiene compras, así que no le corresponde el descuento de bienvenida.</p>' : ''}
      </div>`,
    });
  }

  if (!isEmailEnabled()) {
    return { ok: true, message: '¡Listo! Te vamos a escribir con tu descuento.', emailed: false };
  }

  const code = personalCode(email);
  if (!code) {
    // Sin secreto de firma no se puede emitir un código verificable. Antes de
    // mandar uno que no va a funcionar, se avisa que escribimos nosotros.
    return { ok: true, message: '¡Listo! Te vamos a escribir con tu descuento.', emailed: false };
  }

  const sent = await sendEmail({
    to: email,
    subject: `Tu ${WELCOME.percent}% OFF de bienvenida`,
    html: welcomeEmailHtml(name, code),
  });

  return {
    ok: true,
    message: sent
      ? '¡Listo! Te mandamos el código por mail.'
      : '¡Listo! Te vamos a escribir con tu descuento.',
    emailed: sent,
  };
}
