import { redirect } from 'next/navigation';
import { PageHeader, StatCard, EmptyState } from '@/components/admin/ui';
import { requireAdmin, isOwnerRole } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { getAllSettings } from '@/lib/settings';
import { SuppliersTable, type SupplierRow } from './SuppliersTable';

export const dynamic = 'force-dynamic';

export default async function ProveedoresPage() {
  const me = await requireAdmin();
  if (!isOwnerRole(me.role)) redirect('/admin');
  const supabase = await createClient();
  const { data } = await supabase.rpc('supplier_ranking');
  const rows = ((data ?? []) as SupplierRow[]).map((r) => ({
    ...r,
    avg_cost: Number(r.avg_cost) || 0,
    margin: Number(r.margin) || 0,
  }));
  const settings = await getAllSettings();
  const contacts = (settings.suppliers || {}) as Record<string, { contact?: string }>;

  const topMargin = rows.reduce((a, r) => a + r.margin, 0);

  return (
    <div>
      <PageHeader
        title="Proveedores"
        description="Tus proveedores ordenados por prioridad de uso: lo que más vendés, lo que más ganás y lo que más te piden."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Proveedores" value={String(rows.length)} />
        <StatCard label="Ganancia (sus productos)" value={`$${Math.round(topMargin / 1000)}k`} accent="green" />
        <StatCard label="Top" value={rows[0]?.supplier?.split(' ')[0] || '—'} hint="más prioritario" />
      </div>

      {rows.length === 0 ? (
        <EmptyState message="Todavía no cargaste pedidos a proveedores. Cargalos en Encargos → Pedidos al proveedor y aparecen acá ordenados." />
      ) : (
        <SuppliersTable rows={rows} contacts={contacts} />
      )}
    </div>
  );
}
