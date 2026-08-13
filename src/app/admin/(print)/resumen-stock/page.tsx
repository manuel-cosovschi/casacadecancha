import type { Metadata } from 'next';
import { Logo } from '@/components/brand/Logo';
import { PrintBar } from '@/components/admin/PrintBar';
import { CopyListButton } from './CopyListButton';
import { getStockSummary } from '@/lib/admin/data';
import { getAllSettings } from '@/lib/settings';
import { formatPrice } from '@/lib/utils';

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function ResumenStockPage() {
  const [rows, settings] = await Promise.all([getStockSummary(), getAllSettings()]);
  const wsp = settings.whatsapp?.number || settings.footer?.whatsapp || '';

  const enStock = rows.filter((r) => !r.preorder);
  const enPreventa = rows.filter((r) => r.preorder);
  const totalUnidades = rows.reduce((a, r) => a + r.total, 0);
  const hoy = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // Texto plano para pegar en WhatsApp cuando preguntan qué hay.
  const texto = [
    '*Casaca de Cancha — Disponible* 👕',
    ...enStock.map(
      (r) => `• ${r.product} — ${r.sizes.map((s) => `${s.size}${s.qty > 1 ? ` (${s.qty})` : ''}`).join(', ')} — ${formatPrice(r.price)}`,
    ),
    ...(enPreventa.length
      ? [
          '',
          '*En preventa (por llegar)* 🔴',
          ...enPreventa.map(
            (r) => `• ${r.product} — ${r.sizes.map((s) => `${s.size}${s.qty > 1 ? ` (${s.qty})` : ''}`).join(', ')} — ${formatPrice(r.price)}`,
          ),
        ]
      : []),
  ].join('\n');

  return (
    <>
      <PrintBar back="/admin/stock" hint="Se guarda como PDF desde el menú de impresión" />
      <div className="mx-auto mb-3 max-w-[820px] px-4 print:hidden">
        <CopyListButton text={texto} />
      </div>

      <div className="mx-auto max-w-[820px] bg-white p-8 shadow-card print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-4 border-b-2 border-navy pb-4">
          <div>
            <Logo theme="light" />
            <p className="mt-2 text-xs text-navy/60">
              Mar del Plata{wsp && ` · WhatsApp ${wsp}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xl font-black uppercase tracking-tight text-navy">Stock disponible</p>
            <p className="text-xs text-navy/60">Al {hoy}</p>
            <p className="mt-0.5 text-xs font-semibold text-navy/70">
              {rows.length} modelo{rows.length === 1 ? '' : 's'} · {totalUnidades} unidad
              {totalUnidades === 1 ? '' : 'es'}
            </p>
          </div>
        </header>

        {rows.length === 0 ? (
          <p className="py-10 text-center text-navy/50">No hay stock disponible en este momento.</p>
        ) : (
          <>
            <Bloque titulo="Disponible ahora" rows={enStock} />
            {enPreventa.length > 0 && (
              <Bloque
                titulo="En preventa (por llegar)"
                subtitulo="Se reservan con la seña del 50%."
                rows={enPreventa}
              />
            )}
          </>
        )}

        <footer className="mt-8 border-t border-navy/10 pt-4 text-center">
          <p className="text-xs text-navy/60">
            Precios y disponibilidad sujetos a cambio. Consultanos por WhatsApp 💙
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-navy/40">
            Casaca de Cancha · Vestí Fútbol
          </p>
        </footer>
      </div>
    </>
  );
}

function Bloque({
  titulo,
  subtitulo,
  rows,
}: {
  titulo: string;
  subtitulo?: string;
  rows: Awaited<ReturnType<typeof getStockSummary>>;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="text-sm font-black uppercase tracking-wide text-navy">{titulo}</h2>
      {subtitulo && <p className="text-xs text-navy/55">{subtitulo}</p>}
      <table className="mt-2 w-full text-sm">
        <thead>
          <tr className="border-y border-navy/15 text-left text-[10px] uppercase tracking-widest text-navy/50">
            <th className="py-2">Modelo</th>
            <th className="py-2">Talles disponibles</th>
            <th className="py-2 text-center">Total</th>
            <th className="py-2 text-right">Precio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.product} className="border-b border-navy/5 break-inside-avoid">
              <td className="py-2 pr-3 font-medium text-navy">{r.product}</td>
              <td className="py-2 pr-3">
                <span className="flex flex-wrap gap-1">
                  {r.sizes.map((s) => (
                    <span
                      key={s.size}
                      className="rounded border border-navy/15 px-1.5 py-0.5 text-xs font-bold text-navy/80"
                    >
                      {s.size}
                      {s.qty > 1 && <span className="font-normal text-navy/50"> ×{s.qty}</span>}
                    </span>
                  ))}
                </span>
              </td>
              <td className="py-2 text-center font-semibold text-navy">{r.total}</td>
              <td className="py-2 text-right font-semibold text-navy">{formatPrice(r.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
