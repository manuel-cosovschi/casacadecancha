import { PageHeader } from '@/components/admin/ui';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { getAllSettings } from '@/lib/settings';

export default async function ConfigPage() {
  const s = await getAllSettings();

  return (
    <div className="space-y-5">
      <PageHeader title="Configuración" description="Pagos, envíos, contacto y analítica." />

      <SettingsForm
        settingKey="payments_transfer"
        title="Pago por transferencia"
        initial={s.payments_transfer}
        fields={[
          { key: 'active', label: 'Transferencia activa', type: 'boolean' },
          { key: 'discount_percent', label: 'Descuento (%)', type: 'number' },
          { key: 'alias', label: 'Alias' },
          { key: 'cbu', label: 'CBU / CVU' },
          { key: 'holder', label: 'Titular' },
          { key: 'bank', label: 'Banco / Billetera' },
          { key: 'cuit', label: 'CUIT' },
          { key: 'whatsapp', label: 'WhatsApp para comprobantes' },
          { key: 'text', label: 'Texto visible', full: true },
          { key: 'instructions', label: 'Instrucciones', type: 'textarea', full: true },
        ]}
      />

      <SettingsForm
        settingKey="payments_mercadopago"
        title="Mercado Pago"
        initial={s.payments_mercadopago}
        fields={[
          { key: 'active', label: 'Mercado Pago activo', type: 'boolean' },
          { key: 'link', label: 'Link de pago', full: true },
          { key: 'checkout_pro_active', label: 'Checkout Pro (futuro)', type: 'boolean' },
        ]}
      />

      <SettingsForm
        settingKey="shipping"
        title="Envíos"
        initial={s.shipping}
        fields={[
          { key: 'mdp_text', label: 'Texto entrega Mar del Plata (gratis)', full: true },
          { key: 'nacional_note', label: 'Aviso envío nacional (incluido en el total)', full: true },
          { key: 'text', label: 'Texto general de envíos', type: 'textarea', full: true },
        ]}
      />

      <SettingsForm
        settingKey="shipping_calc"
        title="Calculador de envío"
        initial={s.shipping_calc}
        fields={[
          { key: 'mdp_charge', label: 'Cobrar envío en Mar del Plata (si no, es gratis)', type: 'boolean' },
          { key: 'origin_label', label: 'Tu dirección (referencia)', full: true, hint: 'Solo informativo.' },
          { key: 'origin_lat', label: 'Latitud de tu casa', type: 'number', hint: 'Punto desde donde repartís (Google Maps).' },
          { key: 'origin_lng', label: 'Longitud de tu casa', type: 'number' },
          { key: 'fuel_price', label: 'Precio nafta ($/litro)', type: 'number' },
          { key: 'fuel_consumption', label: 'Consumo del auto (L/100km)', type: 'number' },
          { key: 'round_trip', label: 'Cobrar ida y vuelta (x2)', type: 'boolean' },
          { key: 'road_factor', label: 'Factor calle (recto→real, ej 1.3)', type: 'number' },
          { key: 'mdp_free_km', label: 'Radio gratis (km)', type: 'number', hint: 'Dentro de este radio el envío es gratis (Constitución / hasta Av. Libertad ≈ 3.5).' },
          { key: 'mdp_min', label: 'Costo mínimo MdP ($)', type: 'number' },
          { key: 'mdp_round', label: 'Redondeo MdP ($)', type: 'number', hint: 'Ej 500 = redondea de a $500.' },
          { key: 'mdp_fallback', label: 'Costo si no se ubica la dirección ($)', type: 'number' },
          { key: 'zones', label: 'Zonas de respaldo (una por línea: Nombre|costo)', type: 'textarea', full: true, hint: 'Se usan cuando no se puede ubicar la dirección.' },
          { key: 'national_base', label: 'Envío nacional base — Correo ($)', type: 'number' },
          { key: 'extra_ba', label: 'Extra Buenos Aires ($)', type: 'number' },
          { key: 'extra_centro', label: 'Extra Centro (Cba, SF, ER, LP) ($)', type: 'number' },
          { key: 'extra_cuyo_noa_nea', label: 'Extra Cuyo/NOA/NEA ($)', type: 'number' },
          { key: 'extra_patagonia', label: 'Extra Patagonia ($)', type: 'number' },
        ]}
      />

      <SettingsForm
        settingKey="whatsapp"
        title="WhatsApp"
        initial={s.whatsapp}
        fields={[
          { key: 'active', label: 'Botón flotante activo', type: 'boolean' },
          { key: 'number', label: 'Número (ej: 5492235555555)' },
          { key: 'default_message', label: 'Mensaje inicial', type: 'textarea', full: true },
        ]}
      />

      <SettingsForm
        settingKey="brand"
        title="Marca"
        initial={s.brand}
        fields={[
          { key: 'name', label: 'Nombre' },
          { key: 'slogan', label: 'Slogan' },
          { key: 'descriptor', label: 'Descriptor', full: true },
          { key: 'location', label: 'Ubicación' },
          { key: 'email', label: 'Email' },
        ]}
      />

      <SettingsForm
        settingKey="footer"
        title="Footer y datos legales"
        initial={s.footer}
        fields={[
          { key: 'instagram', label: 'Instagram URL' },
          { key: 'whatsapp', label: 'WhatsApp' },
          { key: 'email', label: 'Email' },
          { key: 'location', label: 'Ubicación' },
          { key: 'legal_name', label: 'Razón social' },
          { key: 'cuit', label: 'CUIT' },
        ]}
      />

      <SettingsForm
        settingKey="analytics"
        title="Analítica y pixels"
        initial={s.analytics}
        fields={[
          { key: 'meta_pixel_id', label: 'Meta Pixel ID' },
          { key: 'ga_id', label: 'Google Analytics ID' },
          { key: 'tiktok_pixel_id', label: 'TikTok Pixel ID' },
          { key: 'meta_domain_verification', label: 'Meta domain verification' },
        ]}
      />
    </div>
  );
}
