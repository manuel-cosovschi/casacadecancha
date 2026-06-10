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
          { key: 'nacional_note', label: 'Aviso envío nacional (costo al recibir)', full: true },
          { key: 'text', label: 'Texto general de envíos', type: 'textarea', full: true },
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
