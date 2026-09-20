import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SOCIO, numeroDeSocio } from '@/lib/socios';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tu carnet de socio',
  robots: { index: false },
};

/**
 * A dónde vuelve la persona después de pasar por Mercado Pago.
 *
 * Lo que dice sale de la BASE, no de la dirección. El `status` que manda
 * Mercado Pago sirve para matizar el mensaje, pero no decide nada: puede no
 * venir —si la persona aprieta la flecha para atrás en vez de completar, vuelve
 * sin ningún parámetro— y antes eso caía en el mensaje de bienvenida. O sea que
 * alguien que no pagó se iba convencido de ser socio, después no le aparecía el
 * descuento en el checkout, y para él la tienda le mintió.
 *
 * Acá tampoco se activa nada: el carnet lo activa el webhook cuando Mercado
 * Pago confirma el pago de verdad. Esta página solo cuenta lo que ya pasó.
 */
export default async function SocioListoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; s?: string }>;
}) {
  const { status, s } = await searchParams;

  let activo = false;
  let numero: number | null = null;
  let fundador = false;
  let encontrado = false;

  if (s) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.rpc('socio_estado_por_id', { p_id: s });
      const fila = Array.isArray(data) ? data[0] : null;
      if (fila) {
        encontrado = true;
        activo = Boolean(fila.activo);
        numero = fila.numero ?? null;
        fundador = Boolean(fila.fundador);
      }
    } catch {
      /* si la base no contesta, abajo se cae al mensaje prudente */
    }
  }

  // 1. El carnet está al día: es lo único que habilita decir "ya sos socio".
  if (activo) {
    return (
      <Marco emoji="🎟️">
        <h1 className="text-3xl font-extrabold uppercase">Bienvenido a {SOCIO.nombre}</h1>
        {numero && (
          <p className="mt-4 inline-block rounded-2xl bg-navy px-8 py-4">
            <span className="block text-xs font-bold tracking-[0.2em] text-celeste">
              SOCIO CASACA
            </span>
            <span className="block text-3xl font-extrabold leading-tight text-cream">
              {numeroDeSocio(numero)}
            </span>
            {fundador && (
              <span className="block text-xs font-bold tracking-widest text-celeste">
                SOCIO FUNDADOR
              </span>
            )}
          </p>
        )}
        <p className="mt-5 text-base leading-relaxed text-navy/70">
          Ya tenés {SOCIO.percent}% en todo y el envío sin cargo en Mar del Plata. No hace falta
          ningún código: entrá al checkout con el mismo mail y se aplica solo.
        </p>
        <Link href="/camisetas" className="btn-primary mt-7 inline-block">
          Ver las camisetas
        </Link>
      </Marco>
    );
  }

  // 2. El pago se rechazó. Lo dice Mercado Pago y no hay nada que interpretar.
  if (status === 'failure') {
    return (
      <Marco emoji="✖️">
        <h1 className="text-3xl font-extrabold uppercase">El pago no salió</h1>
        <p className="mt-3 text-base leading-relaxed text-navy/70">
          No se te cobró nada y todavía no sos socio. Podés intentarlo de nuevo con otro medio de
          pago.
        </p>
        <Link href="/socio" className="btn-primary mt-7 inline-block">
          Volver a intentar
        </Link>
      </Marco>
    );
  }

  // 3. Mercado Pago dice que el pago entró pero el carnet todavía no figura.
  //    Pasa de verdad: el aviso de Mercado Pago tarda unos segundos en llegar.
  //    Acá no se promete nada, se cuenta lo que hay.
  if (status === 'success' || status === 'pending') {
    return (
      <Marco emoji="⏳">
        <h1 className="text-3xl font-extrabold uppercase">Estamos confirmando el pago</h1>
        <p className="mt-3 text-base leading-relaxed text-navy/70">
          Mercado Pago todavía no nos confirmó la cuota. Apenas lo haga se activa el carnet solo y
          te llega un mail con tu número de socio.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-navy/55">
          Suele tardar menos de un minuto. Si pasa un rato largo y no te llega nada, escribinos por
          WhatsApp y lo miramos.
        </p>
        <Link href="/camisetas" className="btn-primary mt-7 inline-block">
          Ver las camisetas
        </Link>
      </Marco>
    );
  }

  // 4. Volvió sin pagar. Es el caso de la flecha para atrás, y es el que antes
  //    mostraba "ya sos socio" a alguien que no había pagado un peso.
  return (
    <Marco emoji="🎟️">
      <h1 className="text-3xl font-extrabold uppercase">Te falta la cuota</h1>
      <p className="mt-3 text-base leading-relaxed text-navy/70">
        {encontrado ? 'Quedaste anotado, pero' : 'Todavía'} no nos llegó el pago, así que el carnet
        no está activo. Se activa apenas se acredita la cuota de {formatPrice(SOCIO.cuota)}.
      </p>
      <Link href="/socio" className="btn-primary mt-7 inline-block">
        Terminar de asociarme
      </Link>
      <p className="mt-4 text-sm text-navy/55">
        Si preferís pagarla por transferencia o en efectivo, escribinos por WhatsApp.
      </p>
    </Marco>
  );
}

function Marco({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-5xl">{emoji}</p>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
