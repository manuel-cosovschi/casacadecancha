import 'server-only';

/**
 * Geolocaliza una dirección dentro de Mar del Plata usando Nominatim (OpenStreetMap).
 * Devuelve {lat,lng} o null si no la encuentra / falla. Best-effort, con timeout.
 *
 * SOLO devuelve un punto cuando OpenStreetMap ubicó la ALTURA exacta.
 *
 * Antes devolvía lo primero que contestara Nominatim, y cuando una calle no
 * tiene numeración cargada la respuesta es un punto cualquiera sobre la calle.
 * Como el envío se cobra por distancia, eso salía plata: "México 3050" caía en
 * un punto a 2,7 km cuando la casa está a 6,1 km de manejo, y el envío se
 * cobró $0 en vez de cobrarse. La misma dirección preguntada de otra forma
 * daba 5,53 km — dos puntos a 3 km uno del otro para la misma casa.
 *
 * Que la mayoría de las calles de Mar del Plata sí tengan altura hace el
 * problema peor, no mejor: funciona bien casi siempre y falla en silencio
 * justo en las que no.
 *
 * Sin altura exacta devuelve null, y el checkout le pide la zona al cliente,
 * que es la respuesta honesta: no sabemos dónde vive, que nos diga.
 */
export async function geocodeMdp(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  const q = `${address.trim()}, Mar del Plata, Buenos Aires, Argentina`;
  // Caja aproximada de Mar del Plata para acotar resultados.
  const viewbox = '-57.68,-37.90,-57.48,-38.12'; // left,top,right,bottom
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar' +
    '&addressdetails=1' +
    `&bounded=1&viewbox=${encodeURIComponent(viewbox)}&q=${encodeURIComponent(q)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'CasacaDeCancha/1.0 (https://casacadecancha.shop)',
        'Accept-Language': 'es',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      lat: string;
      lon: string;
      address?: { house_number?: string };
    }[];
    if (!Array.isArray(data) || data.length === 0) return null;

    // Sin altura, lo que volvió es la calle y no la casa. Un punto al azar sobre
    // una calle de treinta cuadras no sirve para cobrar por distancia.
    if (!data[0].address?.house_number) return null;

    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
