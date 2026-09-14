import Link from 'next/link';
import { PageHeader, StatCard, EmptyState } from '@/components/admin/ui';
import { EstadoPresupuesto } from '@/components/admin/EstadoPresupuesto';
import { listarPresupuestos } from './actions';
import { fechaCorta, validoHasta } from '@/lib/presupuesto';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PresupuestosPage() {
  const lista = await listarPresupuestos();

  const aceptados = lista.filter((p) => p.estado === 'aceptado');
  const enviados = lista.filter((p) => p.estado === 'enviado');
  const cierre = lista.length > 0 ? Math.round((aceptados.length / lista.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Presupuestos"
        description="Lo que cotizaste y en qué terminó."
        action={
          <Link href="/admin/presupuestos/nuevo" className="btn-primary !py-2">
            Nuevo presupuesto
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Presupuestos" value={String(lista.length)} />
        <StatCard
          label="Esperando respuesta"
          value={String(enviados.length)}
          accent={enviados.length > 0 ? 'amber' : 'navy'}
        />
        <StatCard label="Aceptados" value={String(aceptados.length)} accent="green" />
        <StatCard
          label="Cerraste"
          value={`${cierre}%`}
          hint={`${formatPrice(aceptados.reduce((a, p) => a + Number(p.total), 0))} cerrados`}
        />
      </div>

      {lista.length === 0 ? (
        <EmptyState
          message="Todavía no hiciste ninguno. Cuando alguien te pida precio por WhatsApp, armalo acá."
          cta={{ label: 'Armar el primero', href: '/admin/presupuestos/nuevo' }}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead>
              <tr className="border-b border-navy/10 text-left text-navy/50">
                <th className="p-3">Número</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Camisetas</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-right">Seña</th>
                <th className="p-3">Vence</th>
                <th className="p-3">Estado</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const vence = validoHasta(p.created_at, p.valido_dias);
                const vencido = vence.getTime() < Date.now();
                const prendas = (p.items || []).reduce(
                  (a, i) => a + (Number(i.cantidad) || 1),
                  0,
                );
                return (
                  <tr key={p.id} className="border-b border-navy/5">
                    <td className="p-3 font-mono text-xs font-bold text-navy">{p.numero}</td>
                    <td className="p-3">
                      <span className="font-medium text-navy">{p.cliente}</span>
                      {p.contacto && (
                        <span className="block text-xs text-navy/50">{p.contacto}</span>
                      )}
                    </td>
                    <td className="p-3 text-navy/70">
                      {prendas} {prendas === 1 ? 'prenda' : 'prendas'}
                      <span className="block text-xs text-navy/40">
                        {(p.items || [])
                          .map((i) => i.nombre)
                          .join(', ')
                          .slice(0, 46)}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold">{formatPrice(Number(p.total))}</td>
                    <td className="p-3 text-right text-navy/70">{formatPrice(Number(p.sena))}</td>
                    <td className={`p-3 text-xs ${vencido ? 'text-red-600' : 'text-navy/50'}`}>
                      {vencido ? 'Vencido' : fechaCorta(vence)}
                    </td>
                    <td className="p-3">
                      <EstadoPresupuesto numero={p.numero} estado={p.estado} />
                    </td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/admin/presupuesto/${p.numero}`}
                        className="text-xs font-semibold text-celeste-bright hover:underline"
                      >
                        Ver / PDF
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
