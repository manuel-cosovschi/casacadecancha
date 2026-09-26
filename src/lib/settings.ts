import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import type {
  AnnouncementBarSettings,
  HeroSettings,
  MercadoPagoSettings,
  ShippingSettings,
  ShippingCalcSettings,
  TransferSettings,
  WhatsAppSettings,
} from '@/lib/types';

// Valores por defecto: el sitio funciona aunque la base esté vacía.
export const DEFAULT_SETTINGS: Record<string, unknown> = {
  brand: {
    name: 'Casaca de Cancha',
    slogan: 'VESTÍ FÚTBOL.',
    descriptor: 'Camisetas, buzos e indumentaria de fútbol.',
    location: 'Mar del Plata, Buenos Aires, Argentina',
    email: 'cosovschim@gmail.com',
  },
  announcement_bar: {
    active: true,
    messages: [
      { text: 'Envíos a todo el país', active: true },
      { text: 'Somos de Mar del Plata', active: true },
      { text: '10% OFF pagando por transferencia', active: true },
      { text: 'Consultanos por WhatsApp', active: true },
    ],
  } satisfies AnnouncementBarSettings,
  hero: {
    active: true,
    title: 'VESTÍ FÚTBOL.',
    subtitle:
      'Camisetas y buzos para vivir cada partido con tus colores. Desde Mar del Plata a todo el país.',
    cta_text: 'VER CAMISETAS',
    cta_link: '/camisetas',
    secondary_text: 'CONSULTAR POR WHATSAPP',
    image_desktop: '',
    image_mobile: '',
    align: 'left',
  } satisfies HeroSettings,
  trust_strip: {
    items: [
      { title: 'Envíos a todo el país', icon: 'truck' },
      { title: 'Atención por WhatsApp', icon: 'whatsapp' },
      { title: 'Cambios según política vigente', icon: 'refresh' },
    ],
  },
  mundial_block: {
    active: true,
    title: 'EL MUNDIAL SE ALIENTA CON LA CAMISETA PUESTA',
    subtitle: 'Elegí tu casaca y viví cada partido con tus colores.',
    image_url: '',
  },
  /**
   * El bloque de Socio Casaca en la home.
   *
   * `image_url` es el fondo del banner y puede quedar vacío: sin imagen el
   * bloque igual se ve, con el degradado y las rayas de la marca. Así se puede
   * publicar hoy y ponerle la foto cuando esté, sin tocar código ni deployar.
   *
   * El texto NO va quemado en la imagen: se dibuja acá arriba. Una imagen con
   * el texto adentro se recorta en el celular —justo donde está la mitad de la
   * gente— y el botón deja de ser un botón de verdad.
   */
  socio_block: {
    active: true,
    title: 'HACETE SOCIO COMO TE HACÉS DEL CLUB',
    subtitle:
      '15% en todo, envío sin cargo en Mar del Plata y las camisetas que llegan, antes que nadie.',
    image_url: '/banner-socio.webp',
  },
  /**
   * La comunidad de WhatsApp.
   *
   * `link` arranca vacío a propósito. Goat la menciona SOLO si hay un link
   * cargado: mandar gente a una comunidad que no existe es peor que no
   * nombrarla, y es el mismo criterio que con el descuento por transferencia.
   */
  comunidad: {
    active: true,
    nombre: 'La comunidad de Casaca',
    link: '',
    descripcion:
      'Ahí avisamos primero lo que llega, las promos y las camisetas que quedan con un solo talle.',
  },
  whatsapp: {
    active: true,
    number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5492235383082',
    default_message:
      'Hola, vengo desde la web de Casaca de Cancha y quería consultar por una camiseta.',
  } satisfies WhatsAppSettings,
  payments_transfer: {
    active: true,
    discount_percent: 0,
    alias: 'casaca.cancha.mp',
    cbu: '0000000000000000000000',
    holder: '[RAZÓN SOCIAL]',
    bank: 'Mercado Pago',
    cuit: '[CUIT]',
    text: 'Pagá por transferencia bancaria y envianos el comprobante por WhatsApp.',
    instructions:
      'Una vez realizada la transferencia, envianos el comprobante por WhatsApp indicando tu número de pedido.',
  } satisfies TransferSettings,
  payments_mercadopago: {
    active: true,
    link:
      process.env.NEXT_PUBLIC_MERCADOPAGO_LINK ||
      'https://link.mercadopago.com.ar/mgbsoftwarefactory',
    checkout_pro_active: false,
  } satisfies MercadoPagoSettings,
  shipping: {
    national_active: true,
    pickup_active: true,
    pickup_text: 'Retiro en Mar del Plata a coordinar.',
    coordinate_text: 'Envío a coordinar según localidad.',
    flat_rate: 0,
    free_from: 0,
    text: 'En Mar del Plata la entrega es gratis y se coordina por WhatsApp. Al resto del país enviamos por Correo Argentino; el costo del envío se calcula en el checkout y va incluido en el total.',
    mdp_text: 'Coordinamos la entrega en Mar del Plata por WhatsApp, sin cargo.',
    nacional_note: 'Enviamos por Correo Argentino. El costo del envío se calcula en el checkout y va incluido en el total.',
  } satisfies ShippingSettings,
  shipping_calc: {
    mdp_charge: true,
    origin_lat: -37.9530255,
    origin_lng: -57.5745997,
    origin_label: 'Méndez Funes de Millán 1168, Mar del Plata',
    // Nafta súper en Mar del Plata, relevada el 18/09/2026: Gulf $2.151,
    // Puma $2.185, Axion $2.199, Shell $2.223. Estaba en $1.500, un 45% por
    // debajo: cada entrega lejana se cobraba casi a mitad de lo que costaba.
    //
    // Es el único valor de este bloque que se mueve solo, así que no se revisa
    // a mano: hay una tarea automática los lunes que busca el precio del día y,
    // si difiere en $100 o más, abre un PR con el número nuevo. Por debajo de
    // eso no toca nada — el envío se redondea de a $500 y un movimiento chico
    // no cambia un peso de lo que paga nadie.
    //
    // Si alguna vez se carga a mano desde Admin → Configuración, ese valor
    // queda en `store_settings` y PISA a este: `getAllSettings()` mezcla la
    // base por encima de los valores por defecto. Cambiar este número no haría
    // nada y sería muy difícil de darse cuenta.
    fuel_price: 2200,
    fuel_consumption: 9,
    // Se cobra el viaje entero, ida y vuelta. Llevar una camiseta a 7 km son
    // 14 km de manejo: cobrar la mitad es poner la otra mitad de tu bolsillo.
    round_trip: true,
    road_factor: 1.3,
    // Km EN AUTO, no en línea recta. Eran 3.5 de línea recta; medido sobre el
    // callejero real eso da 4.7 (la relación real en Mar del Plata ronda 1.33,
    // no 1.3). Con 4.5 el radio quedaba un poco más chico que el de siempre y
    // Marconi 1070 —un cliente que ya compró dos veces, a 4,3 km— quedaba a
    // 200 metros de un salto de $0 a $2.000. Con 4.7 es exactamente la zona
    // que había antes, bien medida.
    mdp_free_km: 4.7,
    mdp_min: 1500,
    mdp_round: 500,
    mdp_fallback: 3000,
    // Respaldo para cuando no se puede ubicar la dirección. Cada precio sale de
    // medir la distancia REAL en auto hasta el barrio y pasarla por la misma
    // fórmula que cobra el calculador, no de una estimación a ojo.
    //
    // La lista anterior tenía siete barrios y estaba mal donde más dolía:
    // Centro y La Perla figuraban GRATIS y están a 7,6 y 6,2 km de manejo
    // ($3.500 y $2.500). Sierra de los Padres estaba a $6.000 y son 22,5 km,
    // o sea $9.000. Y faltaban casi todos: el que vive en Villa Primera —el
    // caso que destapó todo esto— no encontraba su barrio y elegía "Centro",
    // que estaba en cero.
    //
    // "No lo veo en la lista" existe para que nadie quede trabado sin poder
    // comprar. Vale el costo de respaldo y se termina de arreglar por WhatsApp.
    zones:
      'Alfar|8500\nBatán|7000\nBernardino Rivadavia|3000\nCamet|3500\nCentro|3500\nChapadmalal|15000\nConstitución|0\nDon Bosco|3000\nEstación Norte|2500\nGüemes|4000\nJuramento|6000\nLa Perla|2500\nLas Heras|4000\nLibertad|0\nLos Andes|2000\nLos Troncos|4500\nNo lo veo en la lista|3000\nParque Luro|0\nPlaya Grande|5000\nPompeya|2500\nPuerto|5500\nPunta Mogotes|7000\nSan Carlos|5000\nSan Juan|3000\nSierra de los Padres|9000\nTermas Huincó|6000\nVilla Primera|0',
    national_base: 13000,
    extra_ba: 0,
    extra_centro: 3000,
    extra_cuyo_noa_nea: 6000,
    extra_patagonia: 9000,
  } satisfies ShippingCalcSettings,
  footer: {
    instagram:
      process.env.NEXT_PUBLIC_INSTAGRAM_URL ||
      'https://www.instagram.com/casacadecancha.ar',
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5492235383082',
    email: 'cosovschim@gmail.com',
    location: 'Mar del Plata, Buenos Aires',
    legal_name: '',
    cuit: '',
  },
  seo: {
    title: 'Camisetas de Argentina para el Mundial | Casaca de Cancha',
    description:
      'Camisetas, buzos e indumentaria de fútbol desde Mar del Plata con envíos a todo el país.',
    og_image: '',
  },
  analytics: {
    meta_pixel_id: process.env.NEXT_PUBLIC_META_PIXEL_ID || '',
    ga_id: process.env.NEXT_PUBLIC_GA_ID || '',
    tiktok_pixel_id: '',
    meta_domain_verification: '',
  },
  home_sections: {
    trust: true,
    featured: true,
    collections: true,
    products: true,
    mundial: true,
    socio: true,
    how_to_buy: true,
    faq: true,
  },
  /** Ahorro objetivo (ver /admin/ahorro). Las entradas se guardan acá mismo. */
  savings: {
    active: false,
    name: 'Mi ahorro',
    target_amount: 0,
    target_date: '',
    marketing_pct: 15,
    reinvest_pct: 15,
    entries: [] as { date: string; amount: number; note?: string }[],
  },
  /** Modo vacaciones: pausa los pedidos y muestra el cartel de El Cabra. */
  vacation: {
    enabled: false, // interruptor manual (si está en false, manda el rango de fechas)
    auto: true, // usar el rango de fechas para prender/apagar solo
    from: '', // 'YYYY-MM-DD' inclusive
    until: '', // 'YYYY-MM-DD' inclusive: el último día cerrado
    title: 'Casaca se fue de vacaciones',
    subtitle: 'Volvemos el 20/08 con todo.',
    note: 'Podés seguir mirando el catálogo. Los pedidos vuelven a estar disponibles cuando volvemos.',
  },
};

/** Zona horaria de Argentina (para que el corte del día sea el nuestro). */
const AR_TZ = 'America/Argentina/Buenos_Aires';

/** Fecha de hoy en Argentina como 'YYYY-MM-DD'. */
export function todayAr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export interface VacationState {
  active: boolean;
  title: string;
  subtitle: string;
  note: string;
  until: string;
}

/** ¿Está la tienda de vacaciones ahora? (interruptor manual o rango de fechas). */
export function vacationState(settings: Record<string, any>): VacationState {
  const v = settings?.vacation || {};
  const hoy = todayAr();
  const byDates =
    v.auto !== false && v.from && v.until ? hoy >= v.from && hoy <= v.until : false;
  return {
    active: Boolean(v.enabled) || byDates,
    title: v.title || 'Casaca se fue de vacaciones',
    subtitle: v.subtitle || '',
    note: v.note || '',
    until: v.until || '',
  };
}

/** Carga todas las settings y las fusiona con los defaults. */
export async function getAllSettings(): Promise<Record<string, any>> {
  const merged: Record<string, any> = { ...DEFAULT_SETTINGS };
  if (!isSupabaseConfigured()) return merged;

  try {
    const supabase = await createClient();
    const { data } = await supabase.from('store_settings').select('key, value_json');
    if (data) {
      for (const row of data) {
        merged[row.key] = { ...(merged[row.key] || {}), ...(row.value_json as object) };
      }
    }
  } catch {
    // Si falla, devolvemos defaults.
  }
  return merged;
}

/** Carga una setting puntual por clave. */
export async function getSetting<T = any>(key: string): Promise<T> {
  const all = await getAllSettings();
  return all[key] as T;
}
