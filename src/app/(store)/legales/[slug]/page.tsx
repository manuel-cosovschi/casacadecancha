import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllSettings } from '@/lib/settings';

interface LegalDoc {
  title: string;
  body: (s: Record<string, any>) => string;
}

const DOCS: Record<string, LegalDoc> = {
  envios: {
    title: 'Política de envíos',
    body: (s) =>
      `Realizamos envíos a todo el país desde ${s.footer?.location || 'Mar del Plata'}.\n\n` +
      `${s.shipping?.text || ''}\n\n` +
      `También podés coordinar el retiro en Mar del Plata. Una vez confirmado el pago, coordinamos el despacho y te avisamos por WhatsApp.\n\n` +
      `Los plazos de entrega dependen del correo y la localidad de destino.`,
  },
  cambios: {
    title: 'Cambios y devoluciones',
    body: () =>
      `Aceptamos cambios de talle dentro del plazo de nuestra política vigente, siempre que la prenda esté sin uso, con etiqueta y en su estado original.\n\n` +
      `Para gestionar un cambio, escribinos por WhatsApp indicando tu número de pedido. Los costos de envío de los cambios pueden estar a cargo del cliente según el caso.`,
  },
  devoluciones: {
    title: 'Devoluciones',
    body: () =>
      `Si querés devolver un producto, contactanos por WhatsApp dentro del plazo legal. La prenda debe estar sin uso y en su estado original.\n\n` +
      `Conforme a la normativa de defensa del consumidor, podés ejercer el derecho de arrepentimiento dentro de los 10 días corridos de recibida la compra.`,
  },
  privacidad: {
    title: 'Política de privacidad',
    body: (s) =>
      `En Casaca de Cancha cuidamos tus datos. Sólo utilizamos la información que nos brindás (nombre, contacto y domicilio) para gestionar tu pedido y coordinar el envío.\n\n` +
      `No compartimos tus datos con terceros ajenos a la operación de venta y logística.\n\n` +
      `Ante cualquier consulta sobre tus datos, escribinos a ${s.footer?.email || 'nuestro email'}.`,
  },
  terminos: {
    title: 'Términos y condiciones',
    body: (s) =>
      `Al realizar una compra en Casaca de Cancha aceptás estos términos.\n\n` +
      `Los precios están expresados en pesos argentinos e incluyen impuestos. Las imágenes son ilustrativas; pueden existir leves variaciones de color según la pantalla.\n\n` +
      `Razón social: ${s.footer?.legal_name || '[RAZÓN SOCIAL]'} · CUIT: ${s.footer?.cuit || '[CUIT]'}.\n` +
      `Domicilio comercial: ${s.footer?.location || '[DOMICILIO COMERCIAL]'}.`,
  },
  arrepentimiento: {
    title: 'Botón de arrepentimiento',
    body: (s) =>
      `Conforme a la Resolución 424/2020, podés solicitar la cancelación de tu compra dentro de los 10 días corridos de realizada o de recibido el producto, lo que ocurra último.\n\n` +
      `Para ejercer tu derecho de arrepentimiento, escribinos a ${s.footer?.email || 'nuestro email'} o por WhatsApp al ${s.footer?.whatsapp || ''} indicando tu número de pedido y tus datos. Gestionaremos la devolución a la brevedad.`,
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = DOCS[slug];
  return { title: doc?.title || 'Legales' };
}

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();
  const settings = await getAllSettings();

  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-extrabold uppercase">{doc.title}</h1>
      <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-navy/75">
        {doc.body(settings)}
      </div>
    </div>
  );
}
