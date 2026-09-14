'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import {
  calcular,
  itemsValidos,
  type ItemPresupuesto,
  type TipoDescuento,
} from '@/lib/presupuesto';

export interface PresupuestoGuardado {
  id: string;
  numero: string;
  cliente: string;
  contacto: string | null;
  items: ItemPresupuesto[];
  descuento_tipo: TipoDescuento;
  descuento_valor: number;
  extra_label: string | null;
  extra_monto: number;
  sena_pct: number;
  notas: string | null;
  valido_dias: number;
  subtotal: number;
  descuento: number;
  total: number;
  sena: number;
  estado: string;
  created_at: string;
}

export interface EntradaGuardar {
  cliente: string;
  contacto?: string;
  items: ItemPresupuesto[];
  descuentoTipo: TipoDescuento;
  descuentoValor: number;
  extraLabel?: string;
  extraMonto: number;
  senaPct: number;
  notas?: string;
  validoDias: number;
}

export type ResultadoGuardar =
  | { ok: true; numero: string }
  | { ok: false; error: string };

/**
 * Guarda el presupuesto y devuelve su número.
 *
 * Los totales se recalculan acá y no se confía en los que mandó la pantalla:
 * es lo que se va a imprimir y lo que va a leer el cliente.
 */
export async function guardarPresupuesto(e: EntradaGuardar): Promise<ResultadoGuardar> {
  await requireAdmin();

  const cliente = (e.cliente || '').trim();
  if (cliente.length < 2) return { ok: false, error: 'Poné el nombre del cliente.' };

  const items = itemsValidos(e.items).map((i) => ({
    nombre: i.nombre.trim().slice(0, 120),
    cantidad: Math.max(1, Math.round(Number(i.cantidad) || 1)),
    precio: Math.max(0, Number(i.precio) || 0),
  }));
  if (items.length === 0) return { ok: false, error: 'Agregá al menos una camiseta.' };

  const cuenta = calcular({
    items,
    descuentoTipo: e.descuentoTipo,
    descuentoValor: e.descuentoValor,
    extraMonto: e.extraMonto,
    senaPct: e.senaPct,
  });

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('presupuestos')
      .insert({
        cliente,
        contacto: (e.contacto || '').trim() || null,
        items,
        descuento_tipo: e.descuentoTipo,
        descuento_valor: Math.max(0, Number(e.descuentoValor) || 0),
        extra_label: (e.extraLabel || '').trim() || null,
        extra_monto: cuenta.extra,
        sena_pct: Math.min(100, Math.max(0, Math.round(Number(e.senaPct) || 0))),
        notas: (e.notas || '').trim() || null,
        valido_dias: Math.max(1, Math.round(Number(e.validoDias) || 7)),
        subtotal: cuenta.subtotal,
        descuento: cuenta.descuento,
        total: cuenta.total,
        sena: cuenta.sena,
      })
      .select('numero')
      .single();

    if (error || !data) {
      // Sin la migración 0039 la tabla no existe y el mensaje crudo de
      // Postgres no le dice nada a nadie.
      const falta = /relation .*presupuestos.* does not exist/i.test(error?.message || '');
      return {
        ok: false,
        error: falta
          ? 'Falta aplicar la migración 0039 en la base.'
          : error?.message || 'No se pudo guardar.',
      };
    }

    revalidatePath('/admin/presupuestos');
    return { ok: true, numero: data.numero as string };
  } catch (err) {
    return { ok: false, error: String(err).slice(0, 200) };
  }
}

/** Los últimos presupuestos, para volver a abrirlos o reenviarlos. */
export async function listarPresupuestos(): Promise<PresupuestoGuardado[]> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('presupuestos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    return (data ?? []) as PresupuestoGuardado[];
  } catch {
    return [];
  }
}

/** Uno puntual, por número. Lo usa la hoja que se imprime. */
export async function traerPresupuesto(numero: string): Promise<PresupuestoGuardado | null> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('presupuestos')
      .select('*')
      .eq('numero', numero)
      .maybeSingle();
    return (data as PresupuestoGuardado) ?? null;
  } catch {
    return null;
  }
}

/** Marca en qué terminó, para saber cuántos de los que mandás se cierran. */
export async function marcarEstado(
  numero: string,
  estado: 'enviado' | 'aceptado' | 'rechazado',
): Promise<void> {
  await requireAdmin();
  try {
    const supabase = await createClient();
    await supabase.from('presupuestos').update({ estado }).eq('numero', numero);
    revalidatePath('/admin/presupuestos');
  } catch {
    /* no-op */
  }
}
