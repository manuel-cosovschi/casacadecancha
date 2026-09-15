/**
 * El orden de los talles.
 *
 * Los talles se ordenaban por `sort_order`, que es un número que se escribe a
 * mano y arranca en 0. Una variante creada sin tocarlo se iba al principio, y
 * en la ficha aparecía "L, L, S, M, L, XL, XXL" — así estaba la Argentina 2006.
 *
 * Acá el orden sale del talle mismo, que es un dato que no se puede escribir
 * mal: un XL va después de una L aunque a alguien se le escape el número.
 */

/** De más chico a más grande. Lo que no esté acá va al final, alfabético. */
export const ORDEN_TALLES = [
  'XXS',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  '2XL',
  '3XL',
  '4XL',
] as const;

const INDICE = new Map<string, number>(ORDEN_TALLES.map((t, i) => [t as string, i]));

/** Forma canónica del talle, para comparar sin que moleste el tipeo. */
export function normalizarTalle(size: string | null | undefined): string {
  return (size || '').trim().toUpperCase();
}

/**
 * Qué lugar le toca. Los talles conocidos van primero, en su orden natural;
 * los raros ("Único", "Niño 10") después, alfabéticos entre ellos.
 */
export function posicionTalle(size: string | null | undefined): number {
  const t = normalizarTalle(size);
  const i = INDICE.get(t);
  return i === undefined ? ORDEN_TALLES.length : i;
}

/** Comparador listo para `sort`. */
export function compararTalles(
  a: string | null | undefined,
  b: string | null | undefined,
): number {
  const pa = posicionTalle(a);
  const pb = posicionTalle(b);
  if (pa !== pb) return pa - pb;
  return normalizarTalle(a).localeCompare(normalizarTalle(b), 'es');
}

/**
 * El `sort_order` que le corresponde a un talle nuevo.
 *
 * Se guarda igual aunque la pantalla ya ordene sola: así el dato en la base
 * también queda derecho, y cualquier consulta que ordene por esa columna —una
 * exportación, un reporte— sale bien sin tener que saber de esto.
 */
export function sortOrderDeTalle(size: string | null | undefined): number {
  return posicionTalle(size) + 1;
}
