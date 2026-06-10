'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardMetrics } from '@/lib/admin/metrics';
import { formatPrice } from '@/lib/utils';

const COLORS = ['#0B1F3A', '#8CC8E8', '#C7A76B', '#101820', '#5b8fb0', '#a8d4ec'];

export function DashboardCharts({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard title="Ventas por día">
        {metrics.byDay.length === 0 ? (
          <NoData />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={metrics.byDay}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8CC8E8" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#8CC8E8" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} width={40} />
              <Tooltip formatter={(v: number) => formatPrice(v)} />
              <Area type="monotone" dataKey="revenue" stroke="#0B1F3A" fill="url(#rev)" name="Ventas" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Ganancia por día">
        {metrics.byDay.length === 0 ? (
          <NoData />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={metrics.byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} width={40} />
              <Tooltip formatter={(v: number) => formatPrice(v)} />
              <Bar dataKey="profit" fill="#C7A76B" name="Ganancia" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Ventas por medio de pago">
        {metrics.byPaymentMethod.length === 0 ? (
          <NoData />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={metrics.byPaymentMethod}
                dataKey="total"
                nameKey="method"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(e) => e.method}
              >
                {metrics.byPaymentMethod.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatPrice(v)} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Unidades por talle">
        {metrics.bySize.length === 0 ? (
          <NoData />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={metrics.bySize}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="size" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={30} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="units" fill="#0B1F3A" name="Unidades" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">{title}</h2>
      {children}
    </div>
  );
}

function NoData() {
  return (
    <div className="flex h-[240px] items-center justify-center text-sm text-navy/40">
      Sin datos en este período
    </div>
  );
}
