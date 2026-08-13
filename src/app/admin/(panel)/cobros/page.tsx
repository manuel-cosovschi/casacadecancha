import { PageHeader, StatCard, EmptyState, StatusBadge } from '@/components/admin/ui';
import { QrCode } from '@/components/admin/QrCode';
import { CobroForm, type CobroProduct } from './CobroForm';
import { CobroActions } from './CobroActions';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getAllSettings } from '@/lib/settings';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function CobrosPage() {
  await requireAdmin();
  const supabase = await createClient();
  const settings = await getAllSettings();
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://casacadecancha.shop';
  const alias = settings.payments_transfer?.alias || '—';

  const [{ data: prods }, { data: cobros }] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, price, active, mystery_box, variants:product_variants(size, active)')
      .eq('active', true)
      .order('name'),
    supabase.from('payment_requests').select('*').order('created_at', { ascending: false }).limit(40),
  ]);

  const products: CobroProduct[] = ((prods ?? []) as any[])
    .filter((p) => !p.mystery_box)
    .map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      sizes: (p.variants ?? [])
        .filter((v: any) => v.active !== false && v.size)
        .map((v: any) => v.size as string),
    }));

  const rows = (cobros ?? []) as any[];
  const pendientes = rows.filter((r) => r.status === 'pendiente');
  const cobradoHoy = rows
    .filter((r) => r.status === 'cobrado')
    .reduce((a, r) => a + (Number(r.amount) || 0), 0);

  return (
    <div>
      <PageHeader
        title="Cobros"
        description={`Generá un QR con el monto: la persona lo escanea con la cámara y le aparecen tus datos para transferir por Mercado Pago (alias ${alias}).`}
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label="Pendientes" value={String(pendientes.length)} accent={pendientes.length > 0 ? 'amber' : undefined} />
        <StatCard label="Cobrado" value={formatPrice(cobradoHoy)} accent="green" hint="últimos 40" />
        <StatCard label="Alias" value={alias} hint="destino de la transferencia" />
      </div>

      <div className="mb-5">
        <CobroForm products={products} />
      </div>

      {rows.length === 0 ? (
        <EmptyState message="Todavía no generaste ningún cobro. Elegí un producto arriba y generá el QR." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((r) => {
            const url = `${site}/cobrar/${r.code}`;
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 rounded-xl border border-navy/10 bg-white p-2">
                    <QrCode value={url} size={124} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-navy">{r.code}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-navy" title={r.concept}>
                      {r.concept}
                    </p>
                    <p className="mt-0.5 text-xl font-extrabold text-navy">
                      {formatPrice(Number(r.amount) || 0)}
                    </p>
                    <p className="mt-0.5 text-xs text-navy/45">
                      {new Date(r.created_at).toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
                <CobroActions id={r.id} status={r.status} url={url} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
