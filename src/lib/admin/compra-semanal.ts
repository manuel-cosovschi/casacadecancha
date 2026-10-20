import { createClient } from '@/lib/supabase/server';
import { todayAr } from '@/lib/settings';

/**
 * Sugerencia de compra de la semana, en el Resumen del panel.
 *
 * Es la misma cuenta de "Qué comprar" (`purchase_recommendations`, últimos 90
 * días), pero en vez de esperar a que alguien entre a buscarla aparece sola en
 * la home una vez por semana. Se va con "Listo" y vuelve el lunes siguiente.
 *
 * Lo que ya se vio se guarda en `store_settings` (clave `compra_semanal`), no en
 * el navegador: si se la descarta desde el celular, tampoco aparece en la
 * compu. Esa clave no está en la lista de las públicas, así que no la lee nadie
 * de afuera.
 */
export const COMPRA_SEMANAL_KEY = 'compra_semanal';

export interface SugerenciaCompra {
  product: string;
  size: string;
  sold: number;
  stock: number;
  suggest: number;
}

/** El lunes de esta semana en Argentina, 'YYYY-MM-DD'. Identifica la semana. */
export function lunesDeLaSemana(hoy: string = todayAr()): string {
  const d = new Date(`${hoy}T12:00:00Z`);
  const desdeLunes = (d.getUTCDay() + 6) % 7; // 0 = lunes … 6 = domingo
  d.setUTCDate(d.getUTCDate() - desdeLunes);
  return d.toISOString().slice(0, 10);
}

/** ¿Ya se vio la sugerencia de esta semana? */
export function yaSeVioEstaSemana(valor: { vista?: string } | null | undefined): boolean {
  return valor?.vista === lunesDeLaSemana();
}

/** Lo que hay que reponer, de lo que más se vende a lo que menos. */
export async function sugerenciaDeCompra(): Promise<SugerenciaCompra[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc('purchase_recommendations', { p_days: 90 });
  return ((data ?? []) as SugerenciaCompra[])
    .filter((r) => r.suggest > 0)
    .sort((a, b) => b.sold - a.sold || b.suggest - a.suggest);
}
