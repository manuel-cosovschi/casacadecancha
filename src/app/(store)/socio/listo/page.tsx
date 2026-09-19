import type { Metadata } from 'next';
import Link from 'next/link';
import { SOCIO } from '@/lib/socios';

export const metadata: Metadata = {
  title: 'Ya sos socio',
  robots: { index: false },
};

/**
 * A dónde vuelve la persona después de pagar la cuota.
 *
 * Lo que dice depende de cómo volvió, porque Mercado Pago avisa tres cosas
 * distintas y tratarlas igual termina en alguien creyendo que es socio cuando
 * el pago se rechazó.
 *
 * Acá NO se activa nada: el carnet lo activa el webhook cuando Mercado Pago
 * confirma el pago de verdad. Esta página solo cuenta lo que pasó. Si activara
 * mirando la URL, cualquiera se haría socio escribiendo `?status=success`.
 */
export default async function SocioListoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  if (status === 'failure') {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="text-3xl font-extrabold uppercase">El pago no salió</h1>
          <p className="mt-3 text-base leading-relaxed text-navy/70">
            No se te cobró nada. Podés intentarlo de nuevo con otro medio de pago.
          </p>
          <Link href="/socio" className="btn-primary mt-6 inline-block">
            Volver a intentar
          </Link>
        </div>
      </div>
    );
  }

  const pendiente = status === 'pending';

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-5xl">🎟️</p>
        <h1 className="mt-4 text-3xl font-extrabold uppercase">
          {pendiente ? 'Falta que se acredite' : `Bienvenido a ${SOCIO.nombre}`}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-navy/70">
          {pendiente ? (
            <>
              Mercado Pago todavía está procesando el pago. Apenas se acredite te llega el mail con
              tu número de socio y los beneficios se activan solos.
            </>
          ) : (
            <>
              Ya está. Tu número de socio te llega por mail en un rato.
            </>
          )}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-navy/60">
          No tenés que hacer nada más: entrá al checkout con el mismo mail y el{' '}
          {SOCIO.percent}% y el envío sin cargo se aplican solos.
        </p>
        <Link href="/camisetas" className="btn-primary mt-7 inline-block">
          Ver las camisetas
        </Link>
      </div>
    </div>
  );
}
