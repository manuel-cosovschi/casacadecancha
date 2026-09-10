import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Cliente de Claude para las funciones que usan IA (buscador del catálogo y
 * lectura de fotos para encargos).
 *
 * Todo lo que use esto tiene que funcionar igual SIN la key: la tienda no
 * puede depender de que haya IA configurada. Cada función que la usa tiene su
 * camino de respaldo, y `isAiEnabled()` es el interruptor.
 */
export const AI_MODEL = 'claude-opus-5';

let client: Anthropic | null = null;

export function isAiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAi(): Anthropic | null {
  if (!isAiEnabled()) return null;
  if (!client) client = new Anthropic();
  return client;
}

/**
 * ¿La respuesta vino vacía porque el modelo se negó?
 *
 * Con `stop_reason: 'refusal'` la llamada devuelve 200 y el contenido no
 * sirve, así que hay que mirarlo antes de leer nada. En esta tienda no
 * debería pasar nunca —son camisetas—, pero si pasa, el que llama cae a su
 * camino sin IA en vez de romper la página.
 */
export function wasRefused(res: { stop_reason?: string | null }): boolean {
  return res.stop_reason === 'refusal';
}
