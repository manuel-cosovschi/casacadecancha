import 'server-only';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { getAi, isAiEnabled, wasRefused, AI_MODEL } from '@/lib/ai';
import { buildCatalogSnapshot, type CatalogSnapshot } from '@/lib/catalog-index';
import type { Product } from '@/lib/types';

/**
 * Buscador del catálogo en lenguaje natural.
 *
 * El valor no está solo en encontrar: está en lo que devuelve cuando NO
 * encuentra. Ahí sabemos qué equipo, año y versión quería la persona, y con
 * eso se le arma el encargo pre-cargado y se anota la demanda que se estaba
 * perdiendo en silencio.
 *
 * Sin `ANTHROPIC_API_KEY` no se rompe nada: cae a una búsqueda por texto
 * (`buscarPorTexto`), que encuentra menos pero encuentra.
 */

// Se describe como JSON Schema y no con Zod porque el helper de Zod del SDK
// pide Zod 4, y el proyecto usa Zod 3 para los formularios. Este helper tipa
// igual el `parsed_output` y no ata las dos versiones.
const RESPUESTA_SCHEMA = {
  type: 'object',
  properties: {
    slugs: {
      type: 'array',
      items: { type: 'string' },
      description: 'Slugs del catálogo que corresponden, del mejor al peor. Vacío si ninguno sirve.',
    },
    reply: {
      type: 'string',
      description: 'Una sola frase corta en castellano rioplatense para el cliente.',
    },
    understood: {
      type: 'object',
      properties: {
        equipo: {
          type: ['string', 'null'],
          description: 'Club o selección, en castellano. null si no se deduce.',
        },
        anio: {
          type: ['string', 'null'],
          description: 'Año o temporada, ej "2006" o "24/25". null si no se dice.',
        },
        version: {
          type: ['string', 'null'],
          description: 'titular, suplente, tercera, arquero, retro. null si no se dice.',
        },
        jugador: {
          type: ['string', 'null'],
          description: 'Nombre del jugador si lo menciona. null si no.',
        },
      },
      required: ['equipo', 'anio', 'version', 'jugador'],
      additionalProperties: false,
    },
  },
  required: ['slugs', 'reply', 'understood'],
  additionalProperties: false,
} as const;

export interface Entendido {
  equipo: string | null;
  anio: string | null;
  version: string | null;
  jugador: string | null;
}

export interface SmartSearchResult {
  products: Product[];
  reply: string;
  understood: Entendido | null;
  /** 'ia' si contestó el modelo, 'texto' si fue la búsqueda de respaldo. */
  via: 'ia' | 'texto';
}

const SISTEMA = `Sos el buscador de Casaca de Cancha, una tienda argentina de camisetas de fútbol de Mar del Plata.

Recibís lo que escribió una persona y devolvés qué camisetas del catálogo le sirven.

Cómo trabajar:
- Sabés de fútbol: si piden "la del Milan de Kaká" entendés que es Milan de mediados de los 2000; si piden "la del Dibu" es Argentina con Emiliano Martínez de arquero.
- Devolvé solo slugs que estén en el catálogo, tal cual están escritos. Nunca inventes uno.
- Si algo entra apenas —el equipo correcto pero otro año, o una retro parecida— igual devolvelo, después de las que entran justo.
- Si de verdad no hay nada que se parezca, devolvé la lista vacía. Es mejor decir que no la tenemos que ofrecer cualquier cosa.
- Llená "understood" con lo que la persona quiso, aunque no lo tengamos: sirve para saber qué conviene traer.

El "reply" es una sola frase, en castellano rioplatense, sin saludos ni emojis:
- Si encontraste: describí qué le estás mostrando. Ej: "Estas son las retro de Italia que tenemos."
- Si no encontraste: decilo derecho y mencioná que se puede encargar. Ej: "Esa no la tengo en stock, pero te la puedo encargar."`;

/**
 * Palabras que no distinguen nada en este catálogo.
 *
 * "camiseta" está en el nombre de casi todos los productos: si cuenta como
 * término de búsqueda, "camiseta del Barcelona" matchea con todo y la persona
 * nunca ve el cartel de "no la tenemos", que es lo único que le sirve.
 */
const VACIAS = new Set([
  'camiseta', 'camisetas', 'casaca', 'casacas', 'remera', 'remeras',
  'del', 'los', 'las', 'una', 'unas', 'unos', 'para', 'con', 'por',
  'que', 'quiero', 'busco', 'tenes', 'tienen', 'hay', 'algo', 'alguna',
  'futbol', 'equipo', 'club', 'importada', 'oficial',
]);

/** Búsqueda por texto: el respaldo cuando no hay IA configurada. */
export function buscarPorTexto(query: string, products: Product[]): Product[] {
  const palabras = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !VACIAS.has(w));
  if (palabras.length === 0) return [];

  const normalizar = (s: string) =>
    (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return products
    .map((p) => {
      const heno = normalizar(`${p.name} ${p.short_description || ''} ${p.description || ''}`);
      const puntos = palabras.reduce((a, w) => a + (heno.includes(w) ? 1 : 0), 0);
      return { p, puntos };
    })
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)
    .map((x) => x.p);
}

export async function smartSearch(queryRaw: string): Promise<SmartSearchResult> {
  const query = (queryRaw || '').trim().slice(0, 300);
  const snapshot: CatalogSnapshot = await buildCatalogSnapshot();

  if (!query) {
    return { products: [], reply: '', understood: null, via: 'texto' };
  }

  const ai = getAi();
  if (!ai || !isAiEnabled()) {
    const products = buscarPorTexto(query, snapshot.products);
    return {
      products,
      reply: products.length
        ? ''
        : 'No encontramos nada con eso. Si sabés cuál buscás, te la encargamos.',
      understood: null,
      via: 'texto',
    };
  }

  try {
    const res = await ai.messages.parse({
      model: AI_MODEL,
      max_tokens: 2000,
      // El catálogo va primero y se cachea: cambia poco, y la consulta —que
      // cambia siempre— queda después del breakpoint.
      system: [
        { type: 'text', text: SISTEMA },
        {
          type: 'text',
          text: `CATÁLOGO ACTUAL:\n${snapshot.text}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      // Es una consulta de tienda: la persona está esperando con la página
      // abierta, así que prioriza responder rápido sobre razonar de más.
      output_config: {
        effort: 'low',
        format: jsonSchemaOutputFormat(RESPUESTA_SCHEMA),
      },
      messages: [{ role: 'user', content: query }],
    });

    if (wasRefused(res) || !res.parsed_output) {
      const products = buscarPorTexto(query, snapshot.products);
      return { products, reply: '', understood: null, via: 'texto' };
    }

    const { slugs, reply, understood } = res.parsed_output;
    // Solo slugs que existan de verdad: si el modelo inventa uno, se descarta.
    const products = slugs
      .map((s) => snapshot.bySlug.get(s))
      .filter((p): p is Product => Boolean(p));

    return { products, reply, understood, via: 'ia' };
  } catch (e) {
    // Cualquier problema con la API y la tienda sigue andando. Pero queda
    // registrado: si esto falla siempre, el buscador está degradado sin que
    // nadie se entere, y por fuera se ve igual que funcionando.
    console.error('[buscador] falló la consulta al modelo:', e);
    const products = buscarPorTexto(query, snapshot.products);
    return { products, reply: '', understood: null, via: 'texto' };
  }
}
