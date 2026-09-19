import type { Metadata } from 'next';
import { AltaSocioForm } from './AltaSocioForm';
import { SOCIO } from '@/lib/socios';
import { formatPrice } from '@/lib/utils';
import { LOYALTY } from '@/lib/loyalty-tiers';

export const metadata: Metadata = {
  title: 'Socio Casaca',
  description:
    'El carnet mensual de Casaca de Cancha: 15% en todo, envío sin cargo en Mar del Plata y las camisetas que llegan, antes que nadie.',
};

/** Lo que le toca al socio, en el orden en que le importa. */
const BENEFICIOS = [
  {
    titulo: `${SOCIO.percent}% en todo, desde la primera compra`,
    texto: `Sin carnet ese ${SOCIO.percent}% se consigue recién en la cuarta compra. Siendo socio lo tenés desde el día uno, sin códigos ni nada que tipear: entrás con tu mail y ya está puesto.`,
  },
  {
    titulo: 'Envío sin cargo en Mar del Plata',
    texto: 'Siempre, vivas donde vivas en la ciudad. No hay mínimo de compra.',
  },
  {
    titulo: `Las ves ${SOCIO.ventajaHoras} horas antes`,
    texto:
      'Cuando llega un pedido nuevo, primero lo ven los socios. Las camisetas vienen de a una o dos por talle, así que llegar primero no es un detalle: es la diferencia entre llevártela o mirar cómo se agota.',
  },
  {
    titulo: `Te guardamos el talle ${SOCIO.reservaHoras} horas`,
    texto:
      'Sin pagar nada por adelantado. Lo pensás con tiempo y si al final no va, no va.',
  },
  {
    titulo: 'Encargos sin seña y con prioridad',
    texto:
      'Pedís la camiseta que quieras, de donde sea, sin adelantar plata. Y entrás sí o sí en el próximo pedido al proveedor.',
  },
];

export default function SocioPage() {
  return (
    <div className="container-page py-10">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-navy/50">
          El carnet de Casaca de Cancha
        </p>
        <h1 className="mt-2 text-4xl font-extrabold uppercase leading-none sm:text-5xl">
          {SOCIO.nombre}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-navy/70">
          Hacete socio como te hacés del club: pagás una cuota por mes y tenés{' '}
          <strong>{SOCIO.percent}% en todo</strong>, el envío sin cargo en Mar del Plata, y ves las
          camisetas que llegan antes que el resto.
        </p>

        <div className="mt-7 inline-flex items-baseline gap-2 rounded-2xl border-2 border-navy/15 bg-white px-6 py-4">
          <span className="text-4xl font-extrabold text-navy">{formatPrice(SOCIO.cuota)}</span>
          <span className="text-sm font-semibold text-navy/55">por mes</span>
        </div>
        <p className="mt-2 text-xs text-navy/50">
          Lo cortás cuando quieras. No hay permanencia ni letra chica.
        </p>
      </header>

      <section className="mx-auto mt-12 max-w-2xl">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Qué te llevás</h2>
        <ul className="mt-4 space-y-3">
          {BENEFICIOS.map((b) => (
            <li key={b.titulo} className="card p-5">
              <p className="text-base font-bold text-navy">{b.titulo}</p>
              <p className="mt-1 text-sm leading-relaxed text-navy/65">{b.texto}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* La cuenta, escrita como la haría cualquiera antes de poner la tarjeta.
          Si no le conviene, es mejor que lo sepa ahora: un socio que se siente
          estafado a los dos meses cuesta más caro que uno que nunca se anotó. */}
      <section className="mx-auto mt-12 max-w-2xl">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
          ¿Te conviene? Hacé la cuenta
        </h2>
        <div className="card mt-4 p-5">
          <p className="text-sm leading-relaxed text-navy/70">
            La cuota sale <strong>{formatPrice(SOCIO.cuota * 12)} al año</strong>. Con tres
            camisetas de {formatPrice(52_000)} te ahorrás{' '}
            <strong>{formatPrice(Math.round(52_000 * 3 * (SOCIO.percent / 100)))}</strong> de
            descuento más el envío de cada una.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-navy/70">
            O sea: <strong>desde la tercera camiseta del año el carnet ya se pagó solo</strong>. Si
            comprás una sola cada tanto, te conviene no ser socio y te lo decimos de frente.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-2xl">
        <div className="rounded-2xl border-2 border-navy/15 bg-cream/60 p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-navy/70">
            Los primeros {SOCIO.fundadores}: Socios Fundadores
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-navy/65">
            Número de socio bajo —el tuyo, para siempre— y la cuota te queda congelada en{' '}
            {formatPrice(SOCIO.cuota)} aunque después suba.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-lg">
        <h2 className="text-center text-sm font-bold uppercase tracking-wide text-navy/60">
          Sacá tu carnet
        </h2>
        <div className="mt-4">
          <AltaSocioForm />
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-2xl">
        <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">La letra chica</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-navy/60">
          <li>
            <strong>El descuento no se suma a las promos.</strong> Si la camiseta ya está en promo,
            pagás el precio de promo. Vale el mejor de los dos, nunca los dos juntos. El envío sin
            cargo lo tenés igual.
          </li>
          <li>
            <strong>Tampoco se suma al descuento por compras.</strong> Son dos formas de premiar lo
            mismo: se aplica el que más te convenga. Con el carnet ya estás en el tope ({LOYALTY.tiers[0].percent}%).
          </li>
          <li>
            <strong>El envío sin cargo es en Mar del Plata.</strong> Al resto del país se cobra,
            porque ese costo no lo ponemos nosotros.
          </li>
          <li>
            <strong>Te damos de baja cuando quieras.</strong> Dejás de pagar y listo. Los beneficios
            te duran hasta que termine el mes que ya pagaste.
          </li>
        </ul>
      </section>
    </div>
  );
}
