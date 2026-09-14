import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Logo } from '@/components/brand/Logo';
import { PrintBar } from '@/components/admin/PrintBar';
import { MandarPorWhatsApp } from '@/components/admin/MandarPorWhatsApp';
import { traerPresupuesto } from '@/app/admin/(panel)/presupuestos/actions';
import { getAllSettings } from '@/lib/settings';
import { fechaCorta, validoHasta } from '@/lib/presupuesto';
import { formatPrice } from '@/lib/utils';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * La hoja del presupuesto: lo que se ve es lo que sale en el PDF.
 *
 * Misma cara que el comprobante, que es lo que el cliente ya conoce de la
 * marca. Lo único que se agrega arriba es la barra de acciones, que no se
 * imprime.
 */
export default async function PresupuestoPrintPage({
  params,
}: {
  params: Promise<{ numero: string }>;
}) {
  const { numero } = await params;
  const p = await traerPresupuesto(decodeURIComponent(numero));
  if (!p) notFound();

  const settings = await getAllSettings();
  const wsp = settings.whatsapp?.number || settings.footer?.whatsapp || '';
  const ig = (settings.footer?.instagram || '') as string;
  const transfer = settings.payments_transfer || {};

  const saldo = Math.max(0, Number(p.total) - Number(p.sena));
  const vence = validoHasta(p.created_at, p.valido_dias);
  const vencido = vence.getTime() < Date.now();
  const prendas = (p.items || []).reduce((a, i) => a + (Number(i.cantidad) || 1), 0);

  return (
    <>
      <PrintBar
        back="/admin/presupuestos"
        hint="Guardalo como PDF y mandáselo por WhatsApp"
      />
      <MandarPorWhatsApp
        numero={p.numero}
        cliente={p.cliente}
        contacto={p.contacto}
        total={Number(p.total)}
        sena={Number(p.sena)}
        senaPct={p.sena_pct}
        items={p.items || []}
        vence={fechaCorta(vence)}
      />

      <div className="mx-auto max-w-[820px] bg-white p-8 shadow-card print:max-w-none print:p-0 print:shadow-none">
        {/* Encabezado */}
        <header className="flex items-start justify-between gap-4 border-b-2 border-navy pb-4">
          <div>
            <Logo variant="stacked" theme="light" />
            <p className="mt-2 text-xs text-navy/60">
              {settings.brand?.location || 'Mar del Plata, Argentina'}
              {wsp && ` · WhatsApp ${wsp}`}
            </p>
            {ig && <p className="text-xs text-navy/60">{ig.replace(/^https?:\/\//, '')}</p>}
          </div>
          <div className="text-right">
            <p className="text-xl font-black uppercase tracking-tight text-navy">Presupuesto</p>
            <p className="mt-0.5 font-mono text-sm font-bold text-navy">{p.numero}</p>
            <p className="text-xs text-navy/60">Fecha: {fechaCorta(p.created_at)}</p>
            <p className={`text-xs font-semibold ${vencido ? 'text-red-600' : 'text-navy/60'}`}>
              {vencido ? `Venció el ${fechaCorta(vence)}` : `Válido hasta el ${fechaCorta(vence)}`}
            </p>
          </div>
        </header>

        {/* Cliente */}
        <section className="grid gap-4 py-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-navy/45">Para</p>
            <p className="mt-1 font-bold text-navy">{p.cliente}</p>
            {p.contacto && <p className="text-sm text-navy/70">{p.contacto}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-navy/45">Encargo</p>
            <p className="mt-1 text-sm font-semibold text-navy">
              {prendas} {prendas === 1 ? 'prenda' : 'prendas'}
            </p>
            <p className="text-sm text-navy/70">Importadas a pedido</p>
          </div>
        </section>

        {/* Detalle */}
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-navy/15 text-left text-[10px] uppercase tracking-widest text-navy/50">
              <th className="py-2">Camiseta</th>
              <th className="py-2 text-center">Cant.</th>
              <th className="py-2 text-right">Precio</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(p.items || []).map((i, idx) => {
              const cant = Math.max(1, Number(i.cantidad) || 1);
              return (
                <tr key={idx} className="border-b border-navy/5">
                  <td className="py-2 font-medium text-navy">{i.nombre}</td>
                  <td className="py-2 text-center text-navy/70">{cant}</td>
                  <td className="py-2 text-right text-navy/70">{formatPrice(Number(i.precio))}</td>
                  <td className="py-2 text-right font-semibold text-navy">
                    {formatPrice(Number(i.precio) * cant)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totales */}
        <section className="mt-4 flex justify-end">
          <dl className="w-full max-w-xs space-y-1 text-sm">
            <Row label="Subtotal" value={formatPrice(Number(p.subtotal))} />
            {Number(p.descuento) > 0 && (
              <Row
                label={
                  p.descuento_tipo === 'porcentaje'
                    ? `Descuento ${p.descuento_valor}%`
                    : 'Descuento'
                }
                value={`− ${formatPrice(Number(p.descuento))}`}
              />
            )}
            {Number(p.extra_monto) > 0 && (
              <Row
                label={p.extra_label || 'Extra'}
                value={`+ ${formatPrice(Number(p.extra_monto))}`}
              />
            )}
            <div className="flex justify-between border-t-2 border-navy pt-1.5">
              <dt className="font-black uppercase text-navy">Total</dt>
              <dd className="text-lg font-black text-navy">{formatPrice(Number(p.total))}</dd>
            </div>
          </dl>
        </section>

        {/* Cómo se reserva */}
        <section className="mt-5 rounded-xl border-2 border-navy/15 bg-navy/[0.03] p-4 print:bg-white">
          <p className="text-[10px] font-bold uppercase tracking-widest text-navy/45">
            Para reservarlo
          </p>
          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-navy/70">
              Seña del <strong className="text-navy">{p.sena_pct}%</strong>
            </p>
            <p className="text-2xl font-black text-navy">{formatPrice(Number(p.sena))}</p>
          </div>
          <p className="mt-1 text-sm text-navy/70">
            El saldo de <strong className="text-navy">{formatPrice(saldo)}</strong> se abona al
            recibir el pedido.
          </p>
          {(transfer.alias || transfer.cbu) && (
            <p className="mt-2 border-t border-navy/10 pt-2 text-sm text-navy/70">
              Transferencia:{' '}
              {transfer.alias && (
                <>
                  alias <strong className="text-navy">{transfer.alias}</strong>
                </>
              )}
              {transfer.holder && ` · ${transfer.holder}`}
            </p>
          )}
        </section>

        {p.notas && (
          <section className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-navy/45">Notas</p>
            <p className="mt-1 whitespace-pre-line text-sm text-navy/70">{p.notas}</p>
          </section>
        )}

        {/* Pie */}
        <footer className="mt-8 border-t border-navy/10 pt-4 text-center">
          <p className="text-sm font-bold text-navy">¡Gracias por consultarnos! 💙</p>
          <p className="mt-1 text-xs text-navy/60">
            Presupuesto sin cargo y sin compromiso. Los precios pueden cambiar una vez vencido.
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-navy/40">
            Casaca de Cancha · Vestí Fútbol
          </p>
        </footer>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-navy/60">{label}</dt>
      <dd className="font-medium text-navy">{value}</dd>
    </div>
  );
}
