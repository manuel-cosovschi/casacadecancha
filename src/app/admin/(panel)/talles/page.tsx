import { PageHeader } from '@/components/admin/ui';
import { SizeGuideEditor } from './SizeGuideEditor';
import { getAdminSizeGuides } from '@/lib/admin/data';

export default async function SizeGuidesPage() {
  const guides = await getAdminSizeGuides();

  return (
    <div className="space-y-5">
      <PageHeader title="Guía de talles" description="Editá las tablas de medidas que ve el cliente." />
      {guides.map((g: any) => (
        <SizeGuideEditor key={g.id} guide={g} />
      ))}
      <div>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy/60">Nueva tabla</h2>
        <SizeGuideEditor />
      </div>
    </div>
  );
}
