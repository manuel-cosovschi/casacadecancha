import type { Metadata } from 'next';
import { EncargoRequestForm } from './EncargoRequestForm';

export const metadata: Metadata = {
  title: 'Encargá tu camiseta',
  description:
    'Armá tu encargo de camisetas (mínimo 2) y mandalo a cotizar. Te respondemos por WhatsApp con el precio, la seña para reservar y la fecha estimada de entrega.',
};

export const dynamic = 'force-dynamic';

export default function EncargosPage() {
  return (
    <div className="container-page py-10">
      <div className="mb-8 max-w-2xl">
        <p className="kicker">Encargos a pedido</p>
        <h1 className="mt-2 text-3xl font-extrabold uppercase text-navy sm:text-4xl">
          Encargá las camisetas que quieras
        </h1>
        <p className="mt-3 text-navy/70">
          ¿No la encontrás en la tienda? Armá tu encargo con las camisetas que buscás (mínimo 2
          prendas) y mandalo a cotizar sin compromiso. Lo evaluamos y te escribimos por WhatsApp con
          el <strong>precio</strong>, la <strong>seña del 50%</strong> para reservarlo y la
          <strong> fecha estimada de entrega (aprox. 7 días hábiles)</strong>.
        </p>
      </div>

      <EncargoRequestForm />
    </div>
  );
}
