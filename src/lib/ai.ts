import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import OpenAI from 'openai';

/**
 * La IA de la tienda, sin atarse a un proveedor.
 *
 * Las dos funciones que la usan —el buscador del catálogo y la lectura de
 * fotos para encargos— piden lo mismo: mandá esto, devolveme un JSON con esta
 * forma. Acá se resuelve con Claude o con GPT según qué key haya cargada, y
 * quien llama no se entera de cuál salió.
 *
 * Regla que no se negocia: TODO esto tiene que poder no estar. Sin ninguna key
 * la tienda anda igual — el buscador cae a búsqueda por texto y la subida de
 * fotos avisa que no está disponible. Nadie pierde una compra porque falte una
 * variable de entorno.
 */

export type Proveedor = 'anthropic' | 'openai';

/**
 * Cuál se usa. Si están las dos keys manda Claude, salvo que `AI_PROVIDER`
 * diga otra cosa: así se puede cambiar sin tocar código ni borrar una key.
 */
export function proveedor(): Proveedor | null {
  const forzado = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  if (forzado === 'openai' && process.env.OPENAI_API_KEY) return 'openai';
  if (forzado === 'anthropic' && process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return null;
}

export function isAiEnabled(): boolean {
  return proveedor() !== null;
}

/**
 * El modelo de cada proveedor.
 *
 * Los de OpenAI se pueden pisar con `OPENAI_MODEL` sin tocar el código, que es
 * lo que conviene: los nombres cambian seguido y no hay que salir a deployar
 * por eso. Si el que está puesto no existe, la API lo rechaza y queda el motivo
 * en la tarjeta de Configuración.
 */
export function modelo(p: Proveedor = proveedor() ?? 'anthropic'): string {
  if (p === 'openai') return process.env.OPENAI_MODEL || 'gpt-4o';
  return process.env.ANTHROPIC_MODEL || 'claude-opus-5';
}

/** Compatibilidad con el código que ya lo importaba. */
export const AI_MODEL = 'claude-opus-5';

let anthropic: Anthropic | null = null;
let openai: OpenAI | null = null;

function clienteAnthropic(): Anthropic {
  if (!anthropic) anthropic = new Anthropic();
  return anthropic;
}
function clienteOpenAI(): OpenAI {
  if (!openai) openai = new OpenAI();
  return openai;
}

/** Cuánto queremos que piense. Cada proveedor lo llama distinto. */
export type Esfuerzo = 'bajo' | 'medio';

export interface ImagenEntrada {
  /** Contenido en base64, sin el prefijo `data:`. */
  base64: string;
  /** `image/jpeg`, `image/png`, `image/webp` o `image/gif`. */
  mediaType: string;
}

export interface PedidoJson {
  /** Instrucciones. Van primero y no cambian entre llamadas. */
  sistema: string;
  /**
   * Contexto grande y estable (el catálogo). Se manda aparte para poder
   * cachearlo: es lo que más ocupa y lo que menos cambia.
   */
  contexto?: string;
  /** Lo que escribió la persona. */
  usuario: string;
  imagen?: ImagenEntrada;
  /** Forma exacta de la respuesta, como JSON Schema. */
  schema: Record<string, unknown>;
  /** Nombre del esquema. OpenAI lo exige; Anthropic lo ignora. */
  nombre: string;
  esfuerzo?: Esfuerzo;
  maxTokens?: number;
}

export type RespuestaJson<T> =
  | { ok: true; data: T; via: Proveedor }
  | { ok: false; motivo: 'sin-ia' | 'rechazo' | 'error'; detalle?: string };

/**
 * Pide una respuesta con forma fija y la devuelve tipada.
 *
 * Nunca tira: lo que salga mal vuelve como `ok: false` con el motivo, para que
 * quien llama elija su camino de respaldo en vez de romper la página.
 */
export async function pedirJson<T>(p: PedidoJson): Promise<RespuestaJson<T>> {
  const prov = proveedor();
  if (!prov) return { ok: false, motivo: 'sin-ia' };

  try {
    const data =
      prov === 'anthropic' ? await conClaude<T>(p) : await conGpt<T>(p);
    if (data === 'rechazo') return { ok: false, motivo: 'rechazo' };
    if (data === null) return { ok: false, motivo: 'error' };
    return { ok: true, data, via: prov };
  } catch (e) {
    // Queda registrado: si esto falla siempre, la función está degradada sin
    // que nadie se entere, y por fuera se ve igual que funcionando.
    console.error(`[ia:${prov}] falló la llamada:`, e);
    return { ok: false, motivo: 'error', detalle: String(e).slice(0, 300) };
  }
}

async function conClaude<T>(p: PedidoJson): Promise<T | null | 'rechazo'> {
  const system: Anthropic.TextBlockParam[] = [{ type: 'text', text: p.sistema }];
  if (p.contexto) {
    // El breakpoint va acá: lo de arriba cambia poco y se cachea; la consulta,
    // que cambia siempre, queda después.
    system.push({
      type: 'text',
      text: p.contexto,
      cache_control: { type: 'ephemeral' },
    });
  }

  const contenido: Anthropic.ContentBlockParam[] = [];
  if (p.imagen) {
    contenido.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: p.imagen.mediaType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
        data: p.imagen.base64,
      },
    });
  }
  contenido.push({ type: 'text', text: p.usuario });

  const res = await clienteAnthropic().messages.parse({
    model: modelo('anthropic'),
    max_tokens: p.maxTokens ?? 2000,
    system,
    // Distinguir 2006 de 2007 en una camiseta se juega en detalles chicos, y
    // es una sola llamada por foto. En el buscador, en cambio, la persona está
    // esperando con la página abierta.
    ...(p.esfuerzo === 'medio' ? { thinking: { type: 'adaptive' as const } } : {}),
    output_config: {
      effort: p.esfuerzo === 'medio' ? ('medium' as const) : ('low' as const),
      format: jsonSchemaOutputFormat(p.schema as never),
    },
    messages: [{ role: 'user', content: contenido }],
  });

  // Con `stop_reason: 'refusal'` la llamada devuelve 200 y el contenido no
  // sirve, así que hay que mirarlo antes de leer nada.
  if (res.stop_reason === 'refusal') return 'rechazo';
  return (res.parsed_output as T) ?? null;
}

async function conGpt<T>(p: PedidoJson): Promise<T | null | 'rechazo'> {
  const contenido: OpenAI.Chat.ChatCompletionContentPart[] = [];
  if (p.imagen) {
    contenido.push({
      type: 'image_url',
      image_url: { url: `data:${p.imagen.mediaType};base64,${p.imagen.base64}` },
    });
  }
  contenido.push({ type: 'text', text: p.usuario });

  const res = await clienteOpenAI().chat.completions.create({
    model: modelo('openai'),
    messages: [
      // El contexto grande va en su propio mensaje de sistema: OpenAI cachea
      // solo los prefijos largos, así que conviene que quede al principio y
      // sin mezclarse con la consulta.
      { role: 'system', content: p.sistema },
      ...(p.contexto
        ? [{ role: 'system' as const, content: p.contexto }]
        : []),
      { role: 'user', content: contenido },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: p.nombre,
        schema: p.schema,
        strict: true,
      },
    },
    max_completion_tokens: p.maxTokens ?? 2000,
  });

  const msg = res.choices[0]?.message;
  if (!msg) return null;
  // OpenAI marca la negativa en un campo aparte, no en el motivo de corte.
  if (msg.refusal) return 'rechazo';
  if (!msg.content) return null;
  return JSON.parse(msg.content) as T;
}

/**
 * Prueba que la key configurada realmente funcione.
 *
 * Que haya una variable cargada no quiere decir que sirva: puede estar vencida,
 * sin saldo, o apuntando a un modelo que no existe. Esto lo dice de verdad, y
 * es lo que usa la tarjeta de Configuración.
 */
export async function probarIa(): Promise<{ ok: boolean; via: Proveedor | null; detalle: string }> {
  const prov = proveedor();
  if (!prov) {
    return { ok: false, via: null, detalle: 'No hay ninguna key cargada (ANTHROPIC_API_KEY ni OPENAI_API_KEY).' };
  }

  const res = await pedirJson<{ ok: boolean }>({
    nombre: 'prueba',
    sistema: 'Respondé siempre con {"ok": true}.',
    usuario: 'Decí que sí.',
    esfuerzo: 'bajo',
    maxTokens: 100,
    schema: {
      type: 'object',
      properties: { ok: { type: 'boolean' } },
      required: ['ok'],
      additionalProperties: false,
    },
  });

  if (res.ok) {
    return { ok: true, via: prov, detalle: `Contestó bien usando ${modelo(prov)}.` };
  }
  return {
    ok: false,
    via: prov,
    detalle:
      res.motivo === 'rechazo'
        ? 'El modelo se negó a responder.'
        : res.detalle || 'No se pudo contactar al modelo.',
  };
}
