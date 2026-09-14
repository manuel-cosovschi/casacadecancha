/**
 * Tracking propio de visitas, para ver en el panel quién está en la página
 * ahora y de ahí sacar las estadísticas.
 *
 * Es first-party: los datos van a nuestra propia base, no a un tercero. No se
 * guarda nada personal — un id anónimo que vive en el navegador de la persona,
 * la ruta, de dónde vino y si entró de celular o de compu.
 *
 * Todo lo de acá falla en silencio. Si el tracking se cae, la tienda sigue
 * andando: nadie pierde una compra porque no se pudo contar una visita.
 */

/** Los pasos del camino, para saber en qué anda cada visitante. */
export type Stage = 'mirando' | 'carrito' | 'checkout' | 'compro';

/** Qué pasó. Los nombres viajan igual a la base (ver migración 0038). */
export type HitKind =
  | 'visita'
  | 'producto'
  | 'al_carrito'
  | 'checkout'
  | 'compra'
  | 'busqueda'
  | 'suscripcion';

export interface Hit {
  /** Sin kind es solo un latido: corre el reloj y no deja evento. */
  kind?: HitKind;
  path?: string;
  label?: string;
  value?: number;
  stage?: Stage;
  cart_items?: number;
  cart_value?: number;
  order_number?: string;
}

const SID_KEY = 'cdc_sid';
const UTM_KEY = 'cdc_utm';

/**
 * Id anónimo del visitante. Vive en el navegador y no dice nada de quién es.
 *
 * Si `localStorage` no está disponible (ventana privada, cookies bloqueadas) se
 * usa uno de memoria: esa visita se cuenta igual, y se pierde al cerrar.
 */
let memoria: string | null = null;
export function sessionId(): string {
  const nuevo = () =>
    `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  try {
    let id = localStorage.getItem(SID_KEY);
    if (!id) {
      id = nuevo();
      localStorage.setItem(SID_KEY, id);
    }
    return id;
  } catch {
    if (!memoria) memoria = nuevo();
    return memoria;
  }
}

function device(): 'movil' | 'escritorio' {
  if (typeof window === 'undefined') return 'escritorio';
  return window.matchMedia?.('(max-width: 768px)').matches ? 'movil' : 'escritorio';
}

/** De dónde llegó, solo en la primera página de la visita. */
function referrer(): string {
  try {
    const r = document.referrer || '';
    // El propio sitio no cuenta como origen: eso es navegar, no llegar.
    if (r && new URL(r).host === window.location.host) return '';
    return r;
  } catch {
    return '';
  }
}

function utm(): string {
  try {
    const dela = new URLSearchParams(window.location.search).get('utm_source');
    if (dela) return dela;
    return JSON.parse(sessionStorage.getItem(UTM_KEY) || '{}')?.utm_source || '';
  } catch {
    return '';
  }
}

/**
 * El título de la pestaña, sin la marca, que es como se llama esa página.
 *
 * Sale del título y no de un texto aparte para no tener que tocar cada página:
 * el título ya dice "Camiseta Ajax Icon — adidas Originals".
 */
export function pageLabel(): string {
  if (typeof document === 'undefined') return '';
  return (document.title || '')
    .split(/\s[|·]\s/)[0]
    .replace(/\s*[-–—]\s*Casaca de Cancha\s*$/i, '')
    .trim()
    .slice(0, 120);
}

/**
 * Manda el dato y sigue de largo.
 *
 * Usa `sendBeacon` cuando se puede: sobrevive a que la persona cierre la
 * pestaña justo después, que es exactamente cuando más interesa el dato (la
 * última página que vio antes de irse).
 */
export function track(hit: Hit = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const cuerpo = JSON.stringify({
      sid: sessionId(),
      path: hit.path ?? window.location.pathname,
      label: hit.label ?? pageLabel(),
      device: device(),
      referrer: referrer(),
      utm: utm(),
      ...hit,
    });

    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon(
        '/api/track',
        new Blob([cuerpo], { type: 'application/json' }),
      );
      if (ok) return;
    }
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* el tracking nunca rompe la tienda */
  }
}
