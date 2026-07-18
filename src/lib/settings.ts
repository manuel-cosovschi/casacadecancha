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
      { title: 'Descuento por transferencia', icon: 'discount' },
      { title: 'Cambios según política vigente', icon: 'refresh' },
    ],
  },
  mundial_block: {
    active: true,
    title: 'EL MUNDIAL SE ALIENTA CON LA CAMISETA PUESTA',
    subtitle: 'Elegí tu casaca y viví cada partido con tus colores.',
    image_url: '',
  },
  whatsapp: {
    active: true,
    number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5492235383082',
    default_message:
      'Hola, vengo desde la web de Casaca de Cancha y quería consultar por una camiseta.',
  } satisfies WhatsAppSettings,
  payments_transfer: {
    active: true,
    discount_percent: 10,
    alias: 'casaca.cancha.mp',
    cbu: '0000000000000000000000',
    holder: '[RAZÓN SOCIAL]',
    bank: 'Mercado Pago',
    cuit: '[CUIT]',
    text: 'Pagando por transferencia obtenés un 10% de descuento.',
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
    text: 'En Mar del Plata la entrega es gratis y se coordina por WhatsApp. Al resto del país enviamos y el costo del envío se abona al recibir el producto.',
    mdp_text: 'Coordinamos la entrega en Mar del Plata por WhatsApp, sin cargo.',
    nacional_note: 'El costo del envío se abona al recibir el producto.',
  } satisfies ShippingSettings,
  shipping_calc: {
    mdp_charge: true,
    origin_lat: -38.001,
    origin_lng: -57.559,
    origin_label: 'Méndez de Andés 1168, Mar del Plata',
    fuel_price: 1500,
    fuel_consumption: 9,
    round_trip: true,
    road_factor: 1.3,
    mdp_free_km: 3.5,
    mdp_min: 1500,
    mdp_round: 500,
    mdp_fallback: 3000,
    zones: 'Constitución|0\nCentro|0\nLa Perla|0\nPuerto|2500\nZona Sur|3000\nZona Norte|2500\nSierra de los Padres|6000',
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
    how_to_buy: true,
    faq: true,
  },
};

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
