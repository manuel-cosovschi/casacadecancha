import type { Metadata } from 'next';
import { getSizeGuides } from '@/lib/queries';

export const metadata: Metadata = {
  title: 'Guía de talles',
  description: 'Medidas de camisetas para adultos y niños. Consultanos por WhatsApp ante dudas.',
};

export default async function SizeGuidePage() {
  const guides = await getSizeGuides();

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-extrabold uppercase">Guía de talles</h1>
      <p className="mt-2 max-w-2xl text-navy/70">
        Te recomendamos medir una camiseta cómoda que ya tengas y comparar las medidas.
        Las medidas están en centímetros. Ante cualquier duda, escribinos por WhatsApp.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {guides.map((guide) => (
          <div key={guide.id} className="card overflow-hidden">
            <div className="bg-navy px-5 py-3">
              <h2 className="text-lg font-bold uppercase text-cream">{guide.name}</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy/5 text-left text-navy/70">
                  <th className="px-5 py-2 font-semibold">Talle</th>
                  <th className="px-5 py-2 font-semibold">Ancho (cm)</th>
                  <th className="px-5 py-2 font-semibold">Largo (cm)</th>
                </tr>
              </thead>
              <tbody>
                {(guide.measurements_json || []).map((row, i) => (
                  <tr key={i} className="border-t border-navy/5">
                    <td className="px-5 py-2 font-semibold">{row.size}</td>
                    <td className="px-5 py-2">{row.width}</td>
                    <td className="px-5 py-2">{row.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="mt-8 card p-5">
        <h3 className="font-bold">Cómo medir</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-navy/70">
          <li>Tomá una camiseta cómoda que ya uses.</li>
          <li>Medí el ancho de costura a costura, a la altura de las axilas.</li>
          <li>Medí el largo desde el hombro hasta el borde inferior.</li>
          <li>Compará con la tabla y elegí el talle más cercano.</li>
        </ol>
      </div>
    </div>
  );
}
