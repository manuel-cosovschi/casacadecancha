import { PageHeader } from '@/components/admin/ui';
import { LiveVisitors } from '@/components/admin/LiveVisitors';
import { TrafficStats } from '@/components/admin/TrafficStats';
import { enVivo, estadisticas } from './actions';

/** Sin caché: la gracia de esta pantalla es que muestre lo de este segundo. */
export const dynamic = 'force-dynamic';

const RANGOS = [1, 7, 30, 90];

export default async function EnVivoPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  const { dias } = await searchParams;
  const n = RANGOS.includes(Number(dias)) ? Number(dias) : 7;

  const [vivo, stats] = await Promise.all([enVivo(), estadisticas(n)]);

  return (
    <div className="space-y-7">
      <PageHeader
        title="En vivo"
        description="Quién está en la tienda ahora mismo y qué está haciendo."
      />

      <LiveVisitors inicial={vivo} />

      {stats.sinDatos ? null : <TrafficStats stats={stats} />}

      <p className="text-xs leading-relaxed text-navy/40">
        No se guarda nada personal: un identificador anónimo que vive en el navegador de cada
        persona, la página que está viendo, de dónde llegó y si entró desde el celular o la
        computadora. Ni nombre, ni mail, ni IP. El detalle se borra solo a los 90 días.
      </p>
    </div>
  );
}
