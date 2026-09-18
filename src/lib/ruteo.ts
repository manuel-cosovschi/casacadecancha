import 'server-only';

/**
 * Distancia REAL en auto entre dos puntos, en kilómetros.
 *
 * Antes el envío se cobraba sobre la línea recta multiplicada por un "factor
 * calle" de 1.3. Es una aproximación, y en Mar del Plata se equivoca en las dos
 * direcciones: medido contra el recorrido real, Independencia 1500 daba 6,6 km
 * estimados contra 6,9 reales (cobrábamos de menos), y Marconi 1070 daba 4,1
 * contra 3,7 reales (cobrábamos de más). Un promedio no sabe de diagonales, de
 * manos únicas ni de que para cruzar hay que ir hasta la avenida.
 *
 * Ahora se le pregunta a un ruteador — el mismo motor (OSRM) y los mismos datos
 * que usa openstreetmap.org — cuántos kilómetros hay que manejar de verdad.
 *
 * Devuelve null si no contesta o si no hay camino. Quien llama decide qué hacer
 * con eso; acá no se inventa un número.
 */

const OSRM = 'https://routing.openstreetmap.de/routed-car/route/v1/driving';

/**
 * Las direcciones se consultan al menos dos veces: cuando el cliente aprieta
 * "Calcular" y otra vez cuando el servidor recalcula el costo al confirmar el
 * pedido. Guardar la respuesta evita el segundo viaje y no le pega de más a un
 * servicio gratuito que nos deja usarlo.
 */
const cache = new Map<string, { km: number; at: number }>();
const TTL_MS = 60 * 60 * 1000;
const MAX_CACHE = 500;

/**
 * Techo de cordura, en km de manejo.
 *
 * OSRM no rechaza un destino imposible: lo arrima a la calle más cercana y
 * rutea igual. Un punto en el medio del Atlántico devuelve 225 km tan tranquilo
 * — que a la tarifa de hoy son $60.750 de envío mostrados a un cliente.
 *
 * Geolocalizar acota el destino a Mar del Plata, así que en la práctica no
 * debería pasar. Pero el origen (tu casa) se edita a mano desde el panel, y un
 * dígito de más en la latitud alcanza para que esto rutee desde Córdoba. Entre
 * cotizar un disparate y no cotizar, mejor no cotizar.
 *
 * Sierra de los Padres, lo más lejos que se reparte, son ~20 km.
 */
const MAX_KM = 60;

export async function drivingKm(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
): Promise<number | null> {
  const key =
    `${origin.lat.toFixed(5)},${origin.lng.toFixed(5)};` +
    `${dest.lat.toFixed(5)},${dest.lng.toFixed(5)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.km;

  // OSRM toma las coordenadas al revés que el resto del mundo: lng,lat.
  const url =
    `${OSRM}/${origin.lng},${origin.lat};${dest.lng},${dest.lat}` +
    '?overview=false&alternatives=false&steps=false';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CasacaDeCancha/1.0 (https://casacadecancha.shop)' },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      code?: string;
      routes?: { distance?: number }[];
    };
    // "NoRoute" es una respuesta 200 perfectamente válida que significa que no
    // se puede llegar manejando. No es un kilometraje.
    if (data.code !== 'Ok') return null;

    const metros = data.routes?.[0]?.distance;
    if (typeof metros !== 'number' || !Number.isFinite(metros) || metros <= 0) return null;

    const km = metros / 1000;
    if (km > MAX_KM) return null;

    if (cache.size >= MAX_CACHE) cache.clear();
    cache.set(key, { km, at: Date.now() });
    return km;
  } catch {
    return null;
  }
}
