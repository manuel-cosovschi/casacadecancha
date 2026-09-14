/**
 * La cuenta del presupuesto.
 *
 * Vive acá y no en la pantalla porque la usan tres lugares: el formulario
 * mientras se escribe, el servidor al guardar, y la hoja que se imprime. Si
 * cada uno la hiciera por su cuenta, el cliente podría ver un número distinto
 * del que quedó guardado.
 */

export interface ItemPresupuesto {
  nombre: string;
  cantidad: number;
  precio: number;
}

export type TipoDescuento = 'porcentaje' | 'monto';

export interface EntradaPresupuesto {
  items: ItemPresupuesto[];
  descuentoTipo: TipoDescuento;
  descuentoValor: number;
  extraMonto: number;
  senaPct: number;
}

export interface CuentaPresupuesto {
  /** Suma de los renglones, sin tocar. */
  subtotal: number;
  /** Lo que se descuenta, ya resuelto a plata. */
  descuento: number;
  /** Lo que se suma aparte (envío, estampado, lo que sea). */
  extra: number;
  /** Lo que paga en total. */
  total: number;
  /** Lo que tiene que pasar ahora para reservar. */
  sena: number;
  /** Lo que queda para cuando llega. */
  saldo: number;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Un renglón cuenta solo si tiene nombre: los vacíos del formulario se ignoran. */
export function itemsValidos(items: ItemPresupuesto[]): ItemPresupuesto[] {
  return (items || []).filter((i) => (i?.nombre || '').trim().length > 0);
}

export function calcular(e: EntradaPresupuesto): CuentaPresupuesto {
  const subtotal = itemsValidos(e.items).reduce(
    (a, i) => a + num(i.precio) * Math.max(1, Math.round(num(i.cantidad) || 1)),
    0,
  );

  // El descuento nunca puede dejar el subtotal en negativo, ni con un
  // porcentaje mayor a 100 ni con un monto más grande que el subtotal.
  const bruto =
    e.descuentoTipo === 'monto'
      ? num(e.descuentoValor)
      : Math.round(subtotal * (Math.min(100, num(e.descuentoValor)) / 100));
  const descuento = Math.min(bruto, subtotal);

  const extra = num(e.extraMonto);
  const total = Math.max(0, subtotal - descuento + extra);

  // La seña se calcula sobre el total final, con el extra y el descuento ya
  // adentro: es la plata que la persona tiene que mandar ahora.
  const pct = Math.min(100, Math.max(0, Math.round(num(e.senaPct))));
  const sena = Math.round(total * (pct / 100));

  return { subtotal, descuento, extra, total, sena, saldo: Math.max(0, total - sena) };
}

/** Hasta cuándo vale, a partir de cuándo se hizo. */
export function validoHasta(creado: string | Date, dias: number): Date {
  const d = new Date(creado);
  d.setDate(d.getDate() + Math.max(1, Math.round(dias || 7)));
  return d;
}

export function fechaCorta(d: string | Date): string {
  return new Date(d).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
