import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getAllSettings } from '@/lib/settings';
import { formatPrice, whatsappLink } from '@/lib/utils';
import { CopyField } from './CopyField';

export const metadata: Metadata = { title: 'Pagar', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function CobrarPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc('get_payment_request', { p_code: code });
  const cobro = Array.isArray(data) ? data[0] : data;
  if (!cobro) notFound();

  const settings = await getAllSettings();
  const t = settings.payments_transfer || {};
  const alias = t.alias || '';
  const cbu = t.cbu || '';
  const holder = t.holder || '';
  const bank = t.bank || 'Mercado Pago';
  const wsp = settings.whatsapp?.number || t.whatsapp || '';
  const monto = Number(cobro.amount) || 0;

  const yaPague = `¡Hola! Ya hice la transferencia de ${formatPrice(monto)} por: ${cobro.concept} (código ${cobro.code}). Te paso el comprobante.`;

  if (cobro.status === 'cancelado') {
    return (
      <div className="container-page py-16 text-center">
        <p className="text-2xl">🚫</p>
        <h1 className="mt-2 text-xl font-extrabold text-navy">Este cobro fue cancelado</h1>
        <p className="mt-1 text-navy/60">Pedile a Casaca de Cancha un link nuevo.</p>
      </div>
    );
  }

  return (
    <div className="container-page max-w-lg py-8">
      {cobro.status === 'cobrado' && (
        <p className="mb-4 rounded-xl bg-green-50 p-3 text-center text-sm font-bold text-green-700">
          ✅ Este pago ya figura como recibido. ¡Gracias!
        </p>
      )}

      <div className="rounded-2xl border border-navy/10 bg-white p-6 text-center shadow-card">
        <p className="kicker">Casaca de Cancha</p>
        <h1 className="mt-1 text-lg font-bold text-navy">{cobro.concept}</h1>
        <p className="mt-3 text-4xl font-black text-navy">{formatPrice(monto)}</p>
        <p className="mt-1 text-xs text-navy/50">Código {cobro.code}</p>
      </div>

      <div className="mt-4 rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
          Transferí a estos datos
        </h2>
        <p className="mt-1 text-sm text-navy/65">
          Copiá el alias, abrí Mercado Pago (o tu banco) y transferí el monto de arriba.
        </p>

        <div className="mt-4 space-y-2.5">
          <CopyField label="Alias" value={alias} big />
          {cbu && <CopyField label="CBU / CVU" value={cbu} />}
          <CopyField label="Monto" value={String(monto)} hint={formatPrice(monto)} />
        </div>

        <dl className="mt-4 space-y-1 border-t border-navy/10 pt-3 text-sm">
          {holder && (
            <div className="flex justify-between">
              <dt className="text-navy/55">Titular</dt>
              <dd className="font-medium text-navy">{holder}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-navy/55">Banco / Billetera</dt>
            <dd className="font-medium text-navy">{bank}</dd>
          </div>
        </dl>

        <a
          href="https://www.mercadopago.com.ar/home"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary mt-4 w-full"
        >
          Abrir Mercado Pago →
        </a>

        {wsp && (
          <a
            href={whatsappLink(wsp, yaPague)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-wsp mt-2 w-full"
          >
            Ya transferí, enviar comprobante
          </a>
        )}

        <p className="mt-3 text-center text-xs text-navy/45">
          La transferencia por alias no tiene costo. Enviános el comprobante para confirmar la
          entrega.
        </p>
      </div>
    </div>
  );
}
