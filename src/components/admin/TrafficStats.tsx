'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Link from 'next/link';
import type { Estadisticas } from '@/app/admin/(panel)/en-vivo/actions';

const NAVY = '#0B1F3A';
const CELESTE = '#8CC8E8';

const RANGOS = [
  { dias: 1, label: 'Hoy' },
  { dias: 7, label: '7 días' },
  { dias: 30, label: '30 días' },
  { dias: 90, label: '90 días' },
];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">{title}</h2>
      {children}
    </div>
  );
}

function Vacio() {
  return <p className="py-6 text-center text-sm text-navy/40">Todavía no hay datos.</p>;
}

/**
 * El embudo, por personas.
 *
 * Cada paso muestra qué porcentaje del anterior lo pasó, no del total: eso es
 * lo que dice dónde se está cayendo la gente. Un 90% que entra y mira producto
 * con un 5% que llega al carrito señala el problema mucho mejor que dos
 * porcentajes sobre el total.
 */
function Embudo({ e }: { e: Estadisticas['embudo'] }) {
  const pasos = [
    { label: 'Entraron a la tienda', n: e.entraron },
    { label: 'Miraron una camiseta', n: e.vieron_producto },
    { label: 'Agregaron al carrito', n: e.al_carrito },
    { label: 'Llegaron al checkout', n: e.checkout },
    { label: 'Compraron', n: e.compraron },
  ];
  const tope = Math.max(1, e.entraron);

  return (
    <div className="space-y-2.5">
      {pasos.map((p, i) => {
        const previo = i === 0 ? null : pasos[i - 1].n;
        const pasa = previo && previo > 0 ? Math.round((p.n / previo) * 100) : null;
        const ancho = Math.max(2, Math.round((p.n / tope) * 100));
        const ultimo = i === pasos.length - 1;
        return (
          <div key={p.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-navy/70">{p.label}</span>
              <span className="font-bold text-navy">
                {p.n}
                {pasa !== null && (
                  <span
                    className={`ml-2 text-xs font-semibold ${
                      pasa >= 40 ? 'text-green-600' : pasa >= 15 ? 'text-amber-600' : 'text-red-500'
                    }`}
                  >
                    {pasa}% del paso anterior
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-navy/5">
              <div
                className={`h-full rounded-full ${ultimo ? 'bg-green-500' : 'bg-navy'}`}
                style={{ width: `${ancho}%`, opacity: ultimo ? 1 : 1 - i * 0.15 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TrafficStats({ stats }: { stats: Estadisticas }) {
  if (stats.sinDatos) return null;

  const porDia = stats.por_dia.map((d) => ({
    dia: new Date(d.dia + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
    visitantes: d.visitantes,
  }));
  const porHora = Array.from({ length: 24 }, (_, h) => ({
    hora: `${h}`,
    visitantes: stats.por_hora.find((x) => x.hora === h)?.visitantes ?? 0,
  }));
  const conversion =
    stats.embudo.entraron > 0
      ? Math.round((stats.embudo.compraron / stats.embudo.entraron) * 1000) / 10
      : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-navy">Estadísticas</h2>
        <div className="flex gap-1.5">
          {RANGOS.map((r) => (
            <Link
              key={r.dias}
              href={`/admin/en-vivo?dias=${r.dias}`}
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                stats.dias === r.dias
                  ? 'bg-navy text-cream'
                  : 'bg-navy/5 text-navy/60 hover:bg-navy/10'
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-navy/50">Visitantes</p>
          <p className="mt-1 text-xl font-extrabold text-navy">{stats.visitantes}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-navy/50">Páginas vistas</p>
          <p className="mt-1 text-xl font-extrabold text-navy">{stats.paginas_vistas}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-navy/50">Compraron</p>
          <p className="mt-1 text-xl font-extrabold text-green-600">{stats.embudo.compraron}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-navy/50">Conversión</p>
          <p className="mt-1 text-xl font-extrabold text-navy">{conversion}%</p>
          <p className="mt-0.5 text-xs text-navy/40">de los que entran</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="De dónde se cae la gente">
          <Embudo e={stats.embudo} />
        </Card>

        <Card title="Visitantes por día">
          {porDia.length === 0 ? (
            <Vacio />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={porDia}>
                <CartesianGrid strokeDasharray="3 3" stroke="#0B1F3A14" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="visitantes"
                  stroke={NAVY}
                  fill={CELESTE}
                  fillOpacity={0.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="A qué hora entra la gente">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porHora}>
              <CartesianGrid strokeDasharray="3 3" stroke="#0B1F3A14" />
              <XAxis dataKey="hora" tick={{ fontSize: 10 }} interval={1} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(h) => `${h}:00 hs`} />
              <Bar dataKey="visitantes" fill={NAVY} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-1 text-xs text-navy/40">
            Hora de Argentina. Sirve para elegir cuándo publicar.
          </p>
        </Card>

        <Card title="Camisetas más miradas">
          {stats.productos.length === 0 ? (
            <Vacio />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-navy/40">
                    <th className="pb-2">Camiseta</th>
                    <th className="pb-2 text-right">Vistas</th>
                    <th className="pb-2 text-right">Al carrito</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.productos.map((p) => (
                    <tr key={p.label} className="border-b border-navy/5 last:border-0">
                      <td className="py-2">
                        {p.path ? (
                          <Link href={p.path} className="hover:underline" target="_blank">
                            {p.label}
                          </Link>
                        ) : (
                          p.label
                        )}
                      </td>
                      <td className="py-2 text-right font-medium">{p.vistas}</td>
                      <td className="py-2 text-right">
                        <span
                          className={
                            p.al_carrito > 0 ? 'font-semibold text-amber-700' : 'text-navy/30'
                          }
                        >
                          {p.al_carrito}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="De dónde vienen">
          {stats.origen.length === 0 ? (
            <Vacio />
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {stats.origen.map((o) => (
                  <tr key={o.de} className="border-b border-navy/5 last:border-0">
                    <td className="py-2">{o.de}</td>
                    <td className="py-2 text-right font-medium">{o.visitantes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="mt-3 flex gap-4 border-t border-navy/5 pt-3 text-sm">
            {stats.dispositivos.map((d) => (
              <span key={d.device} className="text-navy/60">
                {d.device === 'movil' ? '📱 Celular' : '💻 Compu'}{' '}
                <strong className="text-navy">{d.visitantes}</strong>
              </span>
            ))}
          </div>
        </Card>

        <Card title="Qué buscaron">
          {stats.busquedas.length === 0 ? (
            <Vacio />
          ) : (
            <>
              <table className="w-full text-sm">
                <tbody>
                  {stats.busquedas.map((b) => (
                    <tr key={b.texto} className="border-b border-navy/5 last:border-0">
                      <td className="py-2">{b.texto}</td>
                      <td className="py-2 text-right font-medium">{b.veces}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-navy/40">
                Lo que busca la gente y no aparece es lo que te falta traer.
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
