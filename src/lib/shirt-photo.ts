import 'server-only';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { getAi, isAiEnabled, wasRefused, AI_MODEL } from '@/lib/ai';

/**
 * Identifica una camiseta a partir de una foto o captura.
 *
 * La parte difícil de pedir un encargo es describir la camiseta con palabras:
 * nadie sabe si la que vio es la 2006 o la 2007, la titular o la suplente. Con
 * la captura de Instagram alcanza.
 *
 * Devuelve además un `confidence`, porque una camiseta a contraluz en una foto
 * borrosa se puede confundir. Con confianza baja se le muestra igual, pero
 * pidiéndole que confirme en vez de dando el dato por cierto.
 */

const TIPOS_OK = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export type TipoImagen = (typeof TIPOS_OK)[number];

/** 5 MB: más que eso es una foto de cámara sin comprimir, no una captura. */
export const MAX_BYTES = 5 * 1024 * 1024;

// JSON Schema y no Zod: el helper de Zod del SDK pide Zod 4 y el proyecto usa
// Zod 3 para los formularios.
const IDENTIFICACION_SCHEMA = {
  type: 'object',
  properties: {
    es_camiseta: {
      type: 'boolean',
      description: 'true solo si la imagen muestra una camiseta de fútbol.',
    },
    equipo: { type: ['string', 'null'], description: 'Club o selección, en castellano.' },
    anio: { type: ['string', 'null'], description: 'Año o temporada, ej "2006" o "24/25".' },
    version: { type: ['string', 'null'], description: 'titular, suplente, tercera, arquero, retro.' },
    jugador: { type: ['string', 'null'], description: 'Jugador estampado, si se ve.' },
    dorsal: { type: ['string', 'null'], description: 'Número estampado, si se ve.' },
    marca: { type: ['string', 'null'], description: 'adidas, Nike, Puma… si se reconoce.' },
    detalles: {
      type: ['string', 'null'],
      description: 'Parches, versión jugador, mangas largas u otra cosa visible. Una frase.',
    },
    confidence: {
      type: 'string',
      enum: ['alta', 'media', 'baja'],
      description: 'Qué tan seguro es el reconocimiento.',
    },
    descripcion: {
      type: 'string',
      description: 'Cómo nombrarla en el pedido, ej "Camiseta Milan 2007 titular — Kaká 22".',
    },
  },
  required: [
    'es_camiseta', 'equipo', 'anio', 'version', 'jugador',
    'dorsal', 'marca', 'detalles', 'confidence', 'descripcion',
  ],
  additionalProperties: false,
} as const;

export interface Identificacion {
  es_camiseta: boolean;
  equipo: string | null;
  anio: string | null;
  version: string | null;
  jugador: string | null;
  dorsal: string | null;
  marca: string | null;
  detalles: string | null;
  confidence: 'alta' | 'media' | 'baja';
  /** Lo que se escribe en el renglón del encargo. */
  descripcion: string;
}

const SISTEMA = `Identificás camisetas de fútbol a partir de fotos, para una tienda argentina que las importa a pedido.

La foto puede ser una captura de Instagram, una foto de una vidriera o una imagen sacada de una web.

Reglas:
- Fijate en el escudo, el sponsor del pecho, la marca, el diseño y el cuello: esas cuatro cosas juntas suelen fijar la temporada.
- Si dudás entre dos temporadas, elegí la más probable y poné confidence "media" o "baja". No inventes precisión que no tenés.
- Si en la imagen no hay una camiseta de fútbol, devolvé es_camiseta false y el resto en null.
- "descripcion" es el renglón del pedido y va en castellano rioplatense, sin adjetivos de venta. Formato: "Camiseta <equipo> <año> <versión>" y, si se ve, " — <jugador> <dorsal>".`;

export interface ResultadoFoto {
  ok: boolean;
  /** Mensaje para mostrarle a la persona cuando algo no salió. */
  message?: string;
  data?: Identificacion;
}

export async function identifyShirt(
  base64: string,
  mediaType: string,
): Promise<ResultadoFoto> {
  if (!isAiEnabled()) {
    return { ok: false, message: 'La lectura de fotos no está disponible por ahora.' };
  }
  if (!TIPOS_OK.includes(mediaType as TipoImagen)) {
    return { ok: false, message: 'La imagen tiene que ser JPG, PNG, WEBP o GIF.' };
  }
  // base64 abulta ~4/3 respecto del archivo original.
  if (base64.length > MAX_BYTES * 1.4) {
    return { ok: false, message: 'La imagen es muy pesada. Probá con una captura más liviana.' };
  }

  const ai = getAi();
  if (!ai) return { ok: false, message: 'La lectura de fotos no está disponible por ahora.' };

  try {
    const res = await ai.messages.parse({
      model: AI_MODEL,
      max_tokens: 2000,
      system: SISTEMA,
      // Acá sí conviene que piense: distinguir 2006 de 2007 en una camiseta se
      // juega en detalles chicos, y es una sola llamada por foto subida.
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'medium',
        format: jsonSchemaOutputFormat(IDENTIFICACION_SCHEMA),
      },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType as TipoImagen, data: base64 },
            },
            { type: 'text', text: '¿Qué camiseta es?' },
          ],
        },
      ],
    });

    if (wasRefused(res) || !res.parsed_output) {
      return { ok: false, message: 'No pudimos leer esa imagen. Probá con otra.' };
    }
    if (!res.parsed_output.es_camiseta) {
      return { ok: false, message: 'En esa imagen no vemos una camiseta. Probá con otra foto.' };
    }
    return { ok: true, data: res.parsed_output };
  } catch (e) {
    console.error('[foto] falló la identificación:', e);
    return { ok: false, message: 'No pudimos leer la imagen ahora. Probá de nuevo en un momento.' };
  }
}
