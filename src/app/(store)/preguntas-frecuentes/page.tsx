import type { Metadata } from 'next';
import { FaqAccordion } from '@/components/store/FaqAccordion';
import { getFAQs } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Preguntas frecuentes',
  description: 'Resolvé tus dudas sobre envíos, pagos, talles y cambios.',
};

export default async function FaqPage() {
  const faqs = await getFAQs();
  return (
    <div className="container-page py-10">
      <h1 className="mb-8 text-3xl font-extrabold uppercase">Preguntas frecuentes</h1>
      <FaqAccordion faqs={faqs} />
    </div>
  );
}
