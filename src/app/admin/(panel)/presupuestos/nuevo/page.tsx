import Link from 'next/link';
import { PageHeader } from '@/components/admin/ui';
import { PresupuestoForm } from '@/components/admin/PresupuestoForm';

export const dynamic = 'force-dynamic';

export default function NuevoPresupuestoPage() {
  return (
    <div>
      <PageHeader
        title="Nuevo presupuesto"
        description="Armalo, generalo y mandáselo por WhatsApp."
        action={
          <Link href="/admin/presupuestos" className="text-sm font-semibold text-navy/60 hover:text-navy">
            ← Ver todos
          </Link>
        }
      />
      <PresupuestoForm />
    </div>
  );
}
