import { PageHeader, EmptyState } from '@/components/admin/ui';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin/auth';
import { whatsappLink } from '@/lib/utils';
import { MarkGroupButton, DeleteRequestButton, ReopenButton } from './GroupActions';

export const dynamic = 'force-dynamic';

interface Req {
  id: string;
  size: string | null;
  phone: string | null;
  email: string | null;
  notified: boolean;
  created_at: string;
  products: { name: string; slug: string } | null;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}

export default async function FaltantesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase
    .from('stock_notifications')
    .select('id, size, phone, email, notified, created_at, products(name, slug)')
    .order('created_at', { ascending: false })
    .limit(300);

  const rows = (data ?? []) as unknown as Req[];
  const pending = rows.filter((r) => !r.notified);
  const done = rows.filter((r) => r.notified);

  // Agrupar pendientes por producto + talle.
  const groups = new Map<string, { product: string; size: string; items: Req[] }>();
  for (const r of pending) {
    const product = r.products?.name ?? 'Producto';
    const size = r.size ?? '—';
    const key = `${product}||${size}`;
    if (!groups.has(key)) groups.set(key, { product, size, items: [] });
    groups.get(key)!.items.push(r);
  }
  const sorted = [...groups.values()].sort((a, b) => b.items.length - a.items.length);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Faltantes"
        description="Gente que dejó su WhatsApp para que le avises cuando entre stock de un producto agotado."
      />

      {pending.length === 0 ? (
        <EmptyState message="No hay pedidos pendientes. Cuando alguien deje su WhatsApp por un producto sin stock, aparece acá." />
      ) : (
        <div className="space-y-3">
          {sorted.map((g) => (
            <div key={`${g.product}-${g.size}`} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-navy">{g.product}</p>
                  <p className="text-sm text-navy/60">
                    Talle <span className="font-semibold">{g.size}</span> · {g.items.length}{' '}
                    {g.items.length === 1 ? 'persona' : 'personas'}
                  </p>
                </div>
                <MarkGroupButton ids={g.items.map((i) => i.id)} />
              </div>
              <ul className="mt-3 space-y-1.5">
                {g.items.map((i) => {
                  const msg = `Hola! Ya tenemos stock de ${g.product}${g.size !== '—' ? ` talle ${g.size}` : ''} 🇦🇷⚽️ Casaca de Cancha`;
                  return (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-navy/80">
                        {i.phone ? (
                          <a
                            href={whatsappLink(i.phone, msg)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-green-600 hover:underline"
                          >
                            📱 {i.phone}
                          </a>
                        ) : (
                          <span className="text-navy/60">{i.email || 'sin contacto'}</span>
                        )}
                        <span className="ml-2 text-xs text-navy/40">{fmt(i.created_at)}</span>
                      </span>
                      <DeleteRequestButton id={i.id} />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-navy/50">
            Ya avisados ({done.length})
          </h2>
          <div className="card p-4 opacity-70">
            <ul className="space-y-1.5 text-sm">
              {done.slice(0, 50).map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-navy/70">
                    {i.products?.name ?? 'Producto'} · talle {i.size ?? '—'} · {i.phone || i.email}
                    <span className="ml-2 text-xs text-navy/40">{fmt(i.created_at)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <ReopenButton ids={[i.id]} />
                    <DeleteRequestButton id={i.id} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
