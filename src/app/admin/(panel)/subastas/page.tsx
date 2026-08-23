import { PageHeader, StatCard, EmptyState } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin/auth';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils';
import { NewAuctionForm, AuctionCard, BiddersPanel } from './SubastasPanel';

export const dynamic = 'force-dynamic';

export default async function SubastasPage() {
  await requireAdmin();
  const supabase = await createClient();

  // Cierra las que ya vencieron antes de mostrar nada.
  try {
    await supabase.rpc('auction_finalize_due');
  } catch {
    /* si falta la migración, lo avisamos más abajo */
  }

  const [auctionsRes, biddersRes] = await Promise.all([
    supabase
      .from('auctions')
      .select('*, bids:auction_bids(id, amount, voided, created_at, bidder:auction_bidders(name, phone))')
      .order('created_at', { ascending: false }),
    supabase.from('auction_bidders').select('*').order('created_at', { ascending: false }).limit(200),
  ]);

  // Si todavía no corriste la migración, avisamos en vez de romper.
  const missing =
    auctionsRes.error &&
    /relation .* does not exist|schema cache|Could not find/i.test(auctionsRes.error.message);

  if (missing) {
    return (
      <div>
        <PageHeader title="Subastas" description="Falta un último paso para activarlo." />
        <div className="card border-amber-300 bg-amber-50 p-5">
          <h2 className="text-base font-bold text-amber-900">Falta crear las tablas</h2>
          <p className="mt-2 text-sm text-amber-900/85">
            El código está listo, pero las tablas de subastas todavía no existen en la base. Abrí
            Supabase → <strong>SQL Editor</strong>, pegá el contenido del archivo{' '}
            <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs">
              supabase/migrations/20260814_auctions.sql
            </code>{' '}
            del repositorio y tocá <strong>Run</strong>. Después recargá esta página.
          </p>
        </div>
      </div>
    );
  }

  const auctions = (auctionsRes.data ?? []) as any[];
  const bidders = (biddersRes.data ?? []) as any[];

  for (const a of auctions) {
    a.bids = (a.bids ?? [])
      .filter((b: any) => !b.voided)
      .sort((x: any, y: any) => Number(y.amount) - Number(x.amount))
      .concat((a.bids ?? []).filter((b: any) => b.voided));
  }

  const activas = auctions.filter((a) => a.status === 'activa');
  const pendientes = bidders.filter((b) => b.status === 'pendiente').length;
  const recaudado = auctions
    .filter((a) => a.status === 'finalizada')
    .reduce((acc, a) => acc + (Number(a.bids?.[0]?.amount) || 0), 0);

  return (
    <div>
      <PageHeader
        title="Subastas"
        description="Publicás una camiseta con precio base y reloj. Para pujar, la gente se registra con su WhatsApp: si ya te compró entra sola, si es nueva la habilitás vos."
        action={<NewAuctionForm />}
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label="En vivo" value={String(activas.length)} accent={activas.length > 0 ? 'green' : undefined} />
        <StatCard
          label="Por habilitar"
          value={String(pendientes)}
          accent={pendientes > 0 ? 'amber' : undefined}
          hint="postores esperando"
        />
        <StatCard label="Recaudado" value={formatPrice(recaudado)} hint="subastas cerradas" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          {auctions.length === 0 ? (
            <EmptyState message="Todavía no creaste ninguna subasta. Tocá “Nueva subasta” para armar la primera." />
          ) : (
            auctions.map((a) => <AuctionCard key={a.id} a={a} />)
          )}
        </div>
        <BiddersPanel bidders={bidders} />
      </div>
    </div>
  );
}
