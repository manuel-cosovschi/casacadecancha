import { PageHeader, EmptyState } from '@/components/admin/ui';
import { ExportButton } from '@/components/admin/ExportButton';
import { getCustomers } from '@/lib/admin/data';
import { whatsappLink } from '@/lib/utils';

export default async function CustomersPage() {
  const customers = await getCustomers();

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${customers.length} clientes`}
        action={
          <ExportButton
            rows={customers.map((c: any) => ({
              nombre: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
              whatsapp: c.phone,
              email: c.email,
              provincia: c.province,
              ciudad: c.city,
              fuente: c.source,
            }))}
            filename="clientes"
          />
        }
      />

      {customers.length === 0 ? (
        <EmptyState message="Todavía no hay clientes registrados." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-navy/50">
                <th className="p-3">Nombre</th>
                <th className="p-3">WhatsApp</th>
                <th className="p-3">Email</th>
                <th className="p-3">Ubicación</th>
                <th className="p-3">Fuente</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c: any) => (
                <tr key={c.id} className="border-b border-navy/5">
                  <td className="p-3 font-medium">{`${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '—'}</td>
                  <td className="p-3">{c.phone || '—'}</td>
                  <td className="p-3 text-navy/60">{c.email || '—'}</td>
                  <td className="p-3">{[c.city, c.province].filter(Boolean).join(', ') || '—'}</td>
                  <td className="p-3"><span className="badge bg-celeste/30 text-navy">{c.source || 'web'}</span></td>
                  <td className="p-3 text-right">
                    {c.phone && (
                      <a href={whatsappLink(c.phone, 'Hola! Te escribimos de Casaca de Cancha.')} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#25D366] hover:underline">
                        WhatsApp
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
