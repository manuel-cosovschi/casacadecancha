import { PageHeader, StatCard } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import type { EncargoRequest } from '@/lib/types';
import { RequestsList } from './RequestsList';

export const dynamic = 'force-dynamic';

export default async function EncargosWebPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from('encargo_requests')
    .select('*')
    .order('created_at', { ascending: false });

  const requests = (data ?? []) as EncargoRequest[];
  const pendientes = requests.filter((r) => r.status === 'pendiente').length;
  const aprobados = requests.filter((r) => r.status === 'aprobado').length;

  return (
    <div>
      <PageHeader
        title="Encargos web"
        description="Los encargos a pedido que arman los clientes desde la web para cotizar. Aprobalos con la cotización o rechazalos, y mandá el aviso por WhatsApp."
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label="Pendientes" value={String(pendientes)} accent={pendientes > 0 ? 'amber' : undefined} />
        <StatCard label="Aprobados" value={String(aprobados)} accent="green" />
        <StatCard label="Total" value={String(requests.length)} />
      </div>

      <RequestsList requests={requests} />
    </div>
  );
}
