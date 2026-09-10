import 'server-only';
import { getActiveProducts } from '@/lib/queries';
import { availableStock } from '@/lib/utils';
import type { Product } from '@/lib/types';

/**
 * Arma el catálogo en texto plano para pasárselo al buscador.
 *
 * Va como prefijo cacheado del prompt (ver `smart-search`), así que tiene que
 * ser ESTABLE: mismo catálogo, mismo texto, byte por byte. Por eso se ordena
 * por slug y no por `sort_order` —que el dueño cambia seguido— y por eso no
 * lleva stock por talle: eso cambia con cada venta y rompería el caché en cada
 * búsqueda. El stock se resuelve después, sobre los productos que devuelve.
 */
export interface CatalogEntry {
  slug: string;
  name: string;
  price: number;
  agotado: boolean;
}

/** Recorta la descripción a lo que sirve para buscar, sin arrastrar el resto. */
function resumen(p: Product): string {
  const texto = (p.short_description || p.description || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return texto.length > 220 ? `${texto.slice(0, 217)}…` : texto;
}

export interface CatalogSnapshot {
  /** Texto que se le manda al modelo. */
  text: string;
  /** Los productos, para resolver los slugs que devuelva. */
  products: Product[];
  bySlug: Map<string, Product>;
}

export async function buildCatalogSnapshot(): Promise<CatalogSnapshot> {
  const products = await getActiveProducts(200);
  const ordenados = [...products].sort((a, b) => a.slug.localeCompare(b.slug));

  const lineas = ordenados.map((p) => {
    const talles = (p.variants ?? [])
      .filter((v) => v.active)
      .map((v) => v.size || '-');
    const partes = [
      `- slug: ${p.slug}`,
      `nombre: ${p.name}`,
      `precio: $${Math.round(p.price).toLocaleString('es-AR')}`,
    ];
    if (talles.length) partes.push(`talles: ${talles.join('/')}`);
    if (p.mystery_box) partes.push('es una Mystery Box (camisetas sorpresa)');
    if (p.preorder) partes.push('es preventa');
    const d = resumen(p);
    if (d) partes.push(`descripción: ${d}`);
    return partes.join(' | ');
  });

  return {
    text: lineas.join('\n'),
    products,
    bySlug: new Map(products.map((p) => [p.slug, p])),
  };
}

/** ¿Le queda algún talle con stock? Se calcula aparte del texto cacheado. */
export function estaAgotado(p: Product): boolean {
  const variantes = (p.variants ?? []).filter((v) => v.active);
  if (variantes.length === 0) return true;
  return variantes.every((v) => availableStock(v) <= 0);
}
