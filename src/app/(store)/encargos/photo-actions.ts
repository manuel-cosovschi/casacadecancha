'use server';

import { identifyShirt, type Identificacion } from '@/lib/shirt-photo';
import { isAiEnabled } from '@/lib/ai';

export interface PhotoResult {
  ok: boolean;
  message?: string;
  data?: Identificacion;
}

/**
 * Lee la foto que subió la persona y devuelve qué camiseta es.
 *
 * Llega como data URL desde el navegador (`data:image/jpeg;base64,...`), que es
 * lo que da un FileReader sin tener que subir el archivo a ningún lado. La
 * imagen no se guarda: se usa para completar el renglón del pedido y se
 * descarta.
 */
export async function identifyShirtPhoto(dataUrl: string): Promise<PhotoResult> {
  if (!isAiEnabled()) {
    return { ok: false, message: 'La lectura de fotos no está disponible por ahora.' };
  }

  const m = /^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/.exec(dataUrl || '');
  if (!m) {
    return { ok: false, message: 'No pudimos leer ese archivo. Probá con una imagen.' };
  }
  const [, mediaType, base64] = m;

  return await identifyShirt(base64, mediaType);
}

/** Para que el formulario sepa si mostrar el bloque de la foto. */
export async function photoReaderAvailable(): Promise<boolean> {
  return isAiEnabled();
}
