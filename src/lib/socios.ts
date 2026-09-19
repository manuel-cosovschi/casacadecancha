import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Socio Casaca: el carnet mensual.
 *
 * Pagás una cuota por mes y mientras estés al día tenés 15% en todo, envío sin
 * cargo en Mar del Plata, y ves lo que llega antes que el resto.
 *
 * LO QUE ESTE PROGRAMA NO HACE, a propósito: no guarda plata del cliente. No
 * hay saldo a favor, ni cuenta corriente, ni nada acumulado. La cuota que entra
 * es de la tienda en el momento; si alguien se da de baja, los beneficios se
 * cortan cuando termina el mes que ya pagó y no queda nada por devolver.
 *
 * Por qué 15% y no más: el margen real del catálogo es 32,6% promedio, y el
 * peor producto queda en 12,5%. Un 20% pondría varias camisetas bajo costo —es
 * el mismo techo que ya tiene el programa de fidelidad, y por el mismo motivo.
 *
 * Por qué el descuento NO se suma al de fidelidad: son dos formas de premiar lo
 * mismo. Se aplica el mejor de los dos. En la práctica el socio llega al 15%
 * desde la primera compra, que sin carnet recién se consigue en la cuarta.
 */
export const SOCIO = {
  active: true,
  nombre: 'Socio Casaca',
  /** Lo que sale por mes. */
  cuota: 2500,
  /** Descuento en todo el catálogo mientras el carnet esté al día. */
  percent: 15,
  /** Días que suma cada cuota paga. */
  dias: 30,
  /** Los primeros N socios se quedan con la cuota de entrada aunque después suba. */
  fundadores: 50,
  /** Horas de ventaja para comprar lo que llega antes de que se publique. */
  ventajaHoras: 48,
  /** Horas que le guardamos un talle sin que pague. */
  reservaHoras: 72,
} as const;

export interface EstadoSocio {
  /** True si el carnet está al día hoy. Es lo único que habilita beneficios. */
  activo: boolean;
  numero: number | null;
  fundador: boolean;
  pagaHasta: string | null;
}

export const SIN_CARNET: EstadoSocio = {
  activo: false,
  numero: null,
  fundador: false,
  pagaHasta: null,
};

/**
 * El carnet de ese mail, si tiene.
 *
 * Va por mail y sin código, igual que el descuento de fidelidad: con escribir
 * el mail en el checkout ya se le aplica lo que le corresponde.
 *
 * Falla cerrado. Si la base no contesta, no hay beneficio: ser socio es un
 * hecho que vive en la base y no hay forma de suponerlo sin regalarle el 15% a
 * cualquiera que escriba un mail.
 */
export async function socioParaEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<EstadoSocio> {
  const limpio = (email || '').trim().toLowerCase();
  if (!SOCIO.active || !limpio.includes('@')) return SIN_CARNET;

  try {
    const { data, error } = await supabase.rpc('socio_estado', { p_email: limpio });
    if (error || !Array.isArray(data) || data.length === 0) return SIN_CARNET;
    const fila = data[0] as {
      activo: boolean;
      numero: number;
      fundador: boolean;
      paga_hasta: string | null;
    };
    return {
      activo: Boolean(fila.activo),
      numero: Number(fila.numero) || null,
      fundador: Boolean(fila.fundador),
      pagaHasta: fila.paga_hasta,
    };
  } catch {
    return SIN_CARNET;
  }
}

/** El número de socio como se escribe: Socio N° 007. */
export function numeroDeSocio(n: number | null | undefined): string {
  if (!n || n < 1) return '';
  return `N° ${String(n).padStart(3, '0')}`;
}

/** Cuántos días le quedan al carnet. Negativo si ya venció. */
export function diasDeCarnet(pagaHasta: string | null, ahora = new Date()): number | null {
  if (!pagaHasta) return null;
  const hasta = new Date(pagaHasta).getTime();
  if (Number.isNaN(hasta)) return null;
  return Math.ceil((hasta - ahora.getTime()) / 86_400_000);
}
