import { PageHeader } from '@/components/admin/ui';
import { SettingsForm } from '@/components/admin/SettingsForm';
import { AnnouncementEditor } from './AnnouncementEditor';
import { getAllSettings } from '@/lib/settings';

export default async function ContentPage() {
  const s = await getAllSettings();

  return (
    <div className="space-y-5">
      <PageHeader title="Contenido de la web" description="Editá los bloques del sitio sin tocar código." />

      <AnnouncementEditor initial={s.announcement_bar} />

      <SettingsForm
        settingKey="hero"
        title="Hero principal"
        initial={s.hero}
        fields={[
          { key: 'active', label: 'Hero visible', type: 'boolean' },
          { key: 'title', label: 'Título' },
          { key: 'subtitle', label: 'Subtítulo', type: 'textarea', full: true },
          { key: 'cta_text', label: 'Texto botón principal' },
          { key: 'cta_link', label: 'Link botón principal' },
          { key: 'secondary_text', label: 'Texto botón secundario' },
          { key: 'image_desktop', label: 'Imagen desktop (URL)', full: true },
          { key: 'image_mobile', label: 'Imagen mobile (URL)', full: true },
          {
            key: 'align',
            label: 'Alineación',
            type: 'select',
            options: [
              { value: 'left', label: 'Izquierda' },
              { value: 'center', label: 'Centro' },
            ],
          },
        ]}
      />

      <SettingsForm
        settingKey="mundial_block"
        title="Bloque emocional del Mundial"
        initial={s.mundial_block}
        fields={[
          { key: 'active', label: 'Bloque visible', type: 'boolean' },
          { key: 'title', label: 'Título', full: true },
          { key: 'subtitle', label: 'Subtítulo', type: 'textarea', full: true },
          { key: 'image_url', label: 'Imagen de fondo (URL)', full: true },
        ]}
      />

      <SettingsForm
        settingKey="seo"
        title="SEO y Open Graph"
        initial={s.seo}
        fields={[
          { key: 'title', label: 'Meta title', full: true },
          { key: 'description', label: 'Meta description', type: 'textarea', full: true },
          { key: 'og_image', label: 'Imagen Open Graph (URL)', full: true },
        ]}
      />
    </div>
  );
}
