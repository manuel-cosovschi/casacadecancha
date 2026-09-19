'use server';

import { createClient } from '@/lib/supabase/server';
import { createPreference, isMercadoPagoProEnabled } from '@/lib/mercadopago';
import { SOCIO } from '@/lib/socios';

/**
 * El alta del carnet de socio.
 *
 * Son dos pasos y en este orden a propósito:
 *
 *  1. Se anota a la persona (nombre, mail, teléfono). Todavía NO es socia: sin
 *     cuota paga no tiene número ni beneficios.
 *  2. Se la manda a pagar a Mercado Pago. Cuando el pago se aprueba, el webhook
 *     activa el carnet.
 *
 * El paso 1 va antes del pago porque el nombre y el teléfono se escriben acá y
 * Mercado Pago no nos los devuelve. Guardarlos primero y mandar solo el id en
 * la referencia del pago es más simple —y más prolijo— que tratar de meter una
 * ficha entera en un campo de texto.
 */

export interface AltaSocioResult {
  ok: boolean;
  url?: string;
  error?: string;
}

const MAX = 120;

export async function altaSocio(input: {
  nombre: string;
  email: string;
  telefono: string;
}): Promise<AltaSocioResult> {
  const nombre = (input.nombre || '').trim().slice(0, MAX);
  const email = (input.email || '').trim().toLowerCase().slice(0, MAX);
  const telefono = (input.telefono || '').trim().slice(0, 40);

  if (nombre.length < 2) return { ok: false, error: 'Escribí tu nombre.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Revisá el mail: hay algo que no cierra.' };
  }
  if (telefono.replace(/\D/g, '').length < 8) {
    return { ok: false, error: 'Dejanos un teléfono para coordinar las entregas.' };
  }

  // Sin Mercado Pago configurado no hay forma de cobrar la cuota. Mejor decirlo
  // que dejar a alguien apretando un botón que no lleva a ningún lado.
  if (!isMercadoPagoProEnabled()) {
    return {
      ok: false,
      error: 'No podemos cobrar la cuota en este momento. Escribinos por WhatsApp y te damos de alta a mano.',
    };
  }

  try {
    const supabase = await createClient();
    const { data: id, error } = await supabase.rpc('socio_prealta', {
      p_email: email,
      p_nombre: nombre,
      p_telefono: telefono,
      p_cuota: SOCIO.cuota,
    });

    if (error || !id) {
      return { ok: false, error: 'No pudimos anotarte. Probá de nuevo en un rato.' };
    }

    const pref = await createPreference({
      // El prefijo es lo que le dice al webhook que esto es una cuota de socio
      // y no un pedido de la tienda.
      orderNumber: `SOCIO:${id}`,
      items: [
        {
          title: `${SOCIO.nombre} — cuota mensual`,
          quantity: 1,
          unit_price: SOCIO.cuota,
        },
      ],
      payerName: nombre,
      payerEmail: email,
      backPath: '/socio/listo',
    });

    if (!pref?.init_point) {
      return { ok: false, error: 'No pudimos abrir el pago. Probá de nuevo en un rato.' };
    }

    return { ok: true, url: pref.init_point };
  } catch {
    return { ok: false, error: 'No pudimos anotarte. Probá de nuevo en un rato.' };
  }
}
