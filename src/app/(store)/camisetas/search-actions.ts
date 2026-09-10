'use server';

import { createClient } from '@/lib/supabase/server';
import { smartSearch } from '@/lib/smart-search';
import { estaAgotado } from '@/lib/catalog-index';
import { isAiEnabled } from '@/lib/ai';
import type { Product } from '@/lib/types';

/** Lo mínimo que necesita la grilla para pintar un resultado. */
export interface SearchHit {
  slug: string;
  name: string;
  price: number;
  image: string | null;
  agotado: boolean;
}

export interface SearchResponse {
  hits: SearchHit[];
  /** Frase del buscador, o vacío. */
  reply: string;
  /** Lo que se entendió del pedido, para pre-cargar el encargo. */
  understood: { equipo: string | null; anio: string | null; version: string | null; jugador: string | null } | null;
  /** Id de la búsqueda, para marcarla si termina en encargo. */
  searchId: string | null;
  /** true si el buscador entiende lenguaje natural; false si es por palabras. */
  inteligente: boolean;
}

function aHit(p: Product): SearchHit {
  return {
    slug: p.slug,
    name: p.name,
    price: p.price,
    image: p.images?.[0]?.url ?? null,
    agotado: estaAgotado(p),
  };
}

/**
 * Busca en el catálogo y deja registrada la consulta.
 *
 * El registro corre igual encuentre o no —y sobre todo cuando NO encuentra—:
 * esa lista es la que después dice qué conviene importar. Nunca rompe la
 * búsqueda: si el log falla, la persona igual ve sus resultados.
 */
export async function searchCatalog(queryRaw: string): Promise<SearchResponse> {
  const query = (queryRaw || '').trim().slice(0, 300);
  const vacio: SearchResponse = {
    hits: [],
    reply: '',
    understood: null,
    searchId: null,
    inteligente: isAiEnabled(),
  };
  if (query.length < 2) return vacio;

  const res = await smartSearch(query);
  const hits = res.products.map(aHit);

  let searchId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc('log_catalog_search', {
      p_query: query,
      p_slugs: res.products.map((p) => p.slug),
      p_understood: res.understood,
      p_source: res.via === 'ia' ? 'catalogo-ia' : 'catalogo-texto',
    });
    searchId = (data as string) ?? null;
  } catch {
    /* el registro es para nosotros, no para el cliente: nunca corta la búsqueda */
  }

  return {
    hits,
    reply: res.reply,
    understood: res.understood,
    searchId,
    inteligente: res.via === 'ia',
  };
}

/** Marca que esa búsqueda terminó en un encargo pedido. */
export async function markSearchBecameRequest(searchId: string): Promise<void> {
  if (!searchId) return;
  try {
    const supabase = await createClient();
    await supabase.rpc('mark_search_became_request', { p_id: searchId });
  } catch {
    /* no-op */
  }
}
