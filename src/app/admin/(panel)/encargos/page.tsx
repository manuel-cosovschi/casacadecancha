import { PageHeader, StatCard, EmptyState } from '@/components/admin/ui';
import { ExportButton } from '@/components/admin/ExportButton';
import { NewEncargoForm } from './NewEncargoForm';
import { EncargoCard } from './EncargoCard';
import { getEncargos } from '@/lib/admin/data';
import { formatPrice } from '@/lib/utils';

export default async function EncargosPage() {
  const encargos = await getEncargos();
  const activos = encargos.filter((e: any) => e.status !== 'cancelado');

  const porPedir = activos.filter((e: any) => !e.supplier_ordered && e.status !== 'entregado').length;
  const sinCobrar = activos.filter((e: any) => !e.paid).length;
  const ganancia = activos.reduce(
    (acc: number, e: any) => acc + (Number(e.sale_price) - Number(e.unit_cost)) * e.quantity,
    0,
  );
  const aCobrar = activos
    .filter((e: any) => !e.paid)
    .reduce((acc: number, e: any) => acc + Number(e.sale_price) * e.quantity, 0);

  const rows = encargos.map((e: any) => ({
    cliente: e.customer_name,
    contacto: e.contact,
    producto: e.product,
    talle: e.size,
    cantidad: e.quantity,
    precio_venta: e.sale_price,
    costo: e.unit_cost,
    ganancia: (Number(e.sale_price) - Number(e.unit_cost)) * e.quantity,
    proveedor: e.supplier,
    pedido_proveedor: e.supplier_ordered ? 'sí' : 'no',
    pagado: e.paid ? 'sí' : 'no',
    estado: e.status,
  }));

  return (
    <div>
      <PageHeader
        title="Encargos"
        description="Pedidos que gestionás por fuera de la web (WhatsApp, etc.)."
        action={<ExportButton rows={rows} filename="encargos" />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Encargos activos" value={String(activos.length)} />
        <StatCard label="Por pedir al proveedor" value={String(porPedir)} accent={porPedir > 0 ? 'amber' : 'navy'} />
        <StatCard label="Sin cobrar" value={String(sinCobrar)} accent={sinCobrar > 0 ? 'amber' : 'navy'} hint={aCobrar > 0 ? formatPrice(aCobrar) : undefined} />
        <StatCard label="Ganancia estimada" value={formatPrice(ganancia)} accent="green" />
      </div>

      <div className="mb-5">
        <NewEncargoForm />
      </div>

      {encargos.length === 0 ? (
        <EmptyState message="Todavía no cargaste encargos. Agregá el primero con el botón de arriba." />
      ) : (
        <div className="space-y-3">
          {encargos.map((e: any) => (
            <EncargoCard key={e.id} e={e} />
          ))}
        </div>
      )}
    </div>
  );
}
