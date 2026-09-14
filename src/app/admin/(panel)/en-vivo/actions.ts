'use server';

import { requireAdmin } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';

export interface PasoRecorrido {
  kind: string;
  path: string | null;
  label: string | null;
  at: string;
}

export interface Visitante {
  id: string;
  path: string | null;
  label: string | null;
  device: string | null;
  referrer: string | null;
  utm_source: string | null;
  stage: 'mirando' | 'carrito' | 'checkout' | 'compro';
  cart_items: number;
  cart_value: number;
  pages: number;
  order_number: string | null;
  first_seen: string;
  last_seen: string;
  recorrido: PasoRecorrido[];
}

export interface EnVivo {
  ahora: number;
  en_checkout: number;
  con_carrito: number;
  valor_en_carritos: number;
  visitantes: Visitante[];
  /** Cuando la base todavía no tiene la migración 0038. */
  sinDatos?: boolean;
}

const VACIO: EnVivo = {
  ahora: 0,
  en_checkout: 0,
  con_carrito: 0,
  valor_en_carritos: 0,
  visitantes: [],
};

/**
 * Quién está en la página ahora mismo.
 *
 * Se consulta cada pocos segundos desde el panel, así que devuelve todo armado
 * en una sola llamada: quién hay, en qué está cada uno y su recorrido.
 */
export async function enVivo(): Promise<EnVivo> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('live_visitors');
    if (error || !data) return { ...VACIO, sinDatos: true };
    const d = data as Record<string, unknown>;
    return {
      ahora: Number(d.ahora) || 0,
      en_checkout: Number(d.en_checkout) || 0,
      con_carrito: Number(d.con_carrito) || 0,
      valor_en_carritos: Number(d.valor_en_carritos) || 0,
      visitantes: (d.visitantes as Visitante[]) ?? [],
    };
  } catch {
    return { ...VACIO, sinDatos: true };
  }
}

export interface Embudo {
  entraron: number;
  vieron_producto: number;
  al_carrito: number;
  checkout: number;
  compraron: number;
}

export interface Estadisticas {
  dias: number;
  visitantes: number;
  paginas_vistas: number;
  embudo: Embudo;
  por_dia: { dia: string; visitantes: number }[];
  por_hora: { hora: number; visitantes: number }[];
  productos: { label: string; path: string; vistas: number; al_carrito: number }[];
  origen: { de: string; visitantes: number }[];
  dispositivos: { device: string; visitantes: number }[];
  busquedas: { texto: string; veces: number }[];
  sinDatos?: boolean;
}

const SIN_STATS: Estadisticas = {
  dias: 7,
  visitantes: 0,
  paginas_vistas: 0,
  embudo: { entraron: 0, vieron_producto: 0, al_carrito: 0, checkout: 0, compraron: 0 },
  por_dia: [],
  por_hora: [],
  productos: [],
  origen: [],
  dispositivos: [],
  busquedas: [],
};

/** Las estadísticas de los últimos N días, calculadas en la base. */
export async function estadisticas(dias = 7): Promise<Estadisticas> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('traffic_stats', { p_days: dias });
    if (error || !data) return { ...SIN_STATS, dias, sinDatos: true };
    return { ...SIN_STATS, ...(data as object) } as Estadisticas;
  } catch {
    return { ...SIN_STATS, dias, sinDatos: true };
  }
}
