import 'server-only';

/**
 * Geolocaliza una dirección dentro de Mar del Plata usando Nominatim (OpenStreetMap).
 * Devuelve {lat,lng} o null si no la encuentra / falla. Best-effort, con timeout.
 */
export async function geocodeMdp(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  const q = `${address.trim()}, Mar del Plata, Buenos Aires, Argentina`;
  // Caja aproximada de Mar del Plata para acotar resultados.
  const viewbox = '-57.68,-37.90,-57.48,-38.12'; // left,top,right,bottom
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ar' +
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
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!Array.isArray(data) || data.length === 0) return null;
    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}
