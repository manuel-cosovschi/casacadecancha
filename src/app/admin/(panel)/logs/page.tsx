import { PageHeader, EmptyState } from '@/components/admin/ui';
import { getActivityLogs } from '@/lib/admin/data';

export default async function LogsPage() {
  const logs = await getActivityLogs();

  return (
    <div>
      <PageHeader title="Logs de actividad" description="Acciones registradas en el panel." />
      {logs.length === 0 ? (
        <EmptyState message="No hay actividad registrada." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-navy/50">
                <th className="p-3">Fecha</th>
                <th className="p-3">Acción</th>
                <th className="p-3">Entidad</th>
                <th className="p-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l: any) => (
                <tr key={l.id} className="border-b border-navy/5">
                  <td className="p-3 text-navy/60">{new Date(l.created_at).toLocaleString('es-AR')}</td>
                  <td className="p-3 font-medium">{l.action}</td>
                  <td className="p-3">{l.entity}{l.entity_id ? ` · ${String(l.entity_id).slice(0, 8)}` : ''}</td>
                  <td className="p-3 text-xs text-navy/50">{JSON.stringify(l.metadata_json)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
