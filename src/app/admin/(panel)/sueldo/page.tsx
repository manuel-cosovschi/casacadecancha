import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/admin/ui';
import { requireAdmin, isOwnerRole } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { getAllSettings } from '@/lib/settings';
import { SueldoPanel } from './SueldoPanel';

export const dynamic = 'force-dynamic';

export default async function SueldoPage() {
  const me = await requireAdmin();
  if (!isOwnerRole(me.role)) redirect('/admin');
  const supabase = await createClient();
  const { data: snap } = await supabase.rpc('finance_snapshot');
  const settings = await getAllSettings();
  const finance = (settings.finance || {}) as {
    cash?: number;
    reinvest_pct?: number;
    restock_pct?: number;
  };

  return (
    <div>
      <PageHeader
        title="Mi Sueldo"
        description="Separá tu plata de la del negocio. Ingresá la plata líquida que tenés y te digo cuánto podés retirar, cuánto dejar para reponer stock y cuánto para marketing."
      />
      <SueldoPanel
        inventoryCost={Number(snap?.inventory_cost) || 0}
        inventoryUnits={Number(snap?.inventory_units) || 0}
        pendingCollect={Number(snap?.pending_collect) || 0}
        initial={{
          cash: Number(finance.cash) || 0,
          reinvestPct: finance.reinvest_pct ?? 20,
          restockPct: finance.restock_pct ?? 30,
        }}
      />
    </div>
  );
}
