'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveSupplierContact } from './actions';
import { formatPrice, whatsappLink } from '@/lib/utils';

export interface SupplierRow {
  supplier: string;
  products: number;
  units_ordered: number;
  avg_cost: number;
  units_sold: number;
  margin: number;
  demand: number;
  last_order: string | null;
  score: number;
}

const keyOf = (s: string) => s.trim().toLowerCase();

export function SuppliersTable({
  rows,
  contacts,
}: {
  rows: SupplierRow[];
  contacts: Record<string, { contact?: string }>;
}) {
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <SupplierCard key={r.supplier} rank={i + 1} row={r} contact={contacts[keyOf(r.supplier)]?.contact || ''} />
      ))}
    </div>
  );
}

function SupplierCard({ rank, row, contact }: { rank: number; row: SupplierRow; contact: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(contact);

  const contactHref = (() => {
    const c = contact.trim();
    if (!c) return null;
    if (/^https?:\/\//i.test(c)) return c;
    const digits = c.replace(/\D/g, '');
    if (digits.length >= 8) return whatsappLink(digits, `Hola! Te escribo de Casaca de Cancha 👋`);
    return null;
  })();

  function save() {
    start(async () => {
      await saveSupplierContact(keyOf(row.supplier), val);
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${rank <= 3 ? 'bg-navy text-cream' : 'bg-navy/10 text-navy/60'}`}>
            {rank}
          </span>
          <div>
            <p className="font-bold text-navy">{row.supplier}</p>
            <p className="text-xs text-navy/50">
              {row.products} {row.products === 1 ? 'producto' : 'productos'} · {row.units_ordered} u. compradas
              {row.avg_cost ? ` · costo prom. ${formatPrice(row.avg_cost)}` : ''}
              {row.last_order ? ` · última compra ${new Date(row.last_order).toLocaleDateString('es-AR')}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contactHref && !editing && (
            <a href={contactHref} target="_blank" rel="noopener noreferrer" className="btn-wsp !px-3 !py-1.5 text-xs">
              Contactar
            </a>
          )}
          {editing ? (
            <div className="flex items-center gap-1.5">
              <input
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder="WhatsApp o link"
                className="input !w-40 !py-1.5 !text-sm"
              />
              <button onClick={save} disabled={pending} className="rounded-lg bg-navy px-2.5 py-1.5 text-xs font-semibold text-cream disabled:opacity-60">
                {pending ? '…' : 'OK'}
              </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="text-xs font-semibold text-navy/50 hover:text-navy">
              {contact ? 'Editar contacto' : '+ Contacto'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Metric label="Vendidas" value={String(row.units_sold)} />
        <Metric label="Ganancia" value={formatPrice(row.margin)} accent />
        <Metric label="En espera" value={row.demand > 0 ? String(row.demand) : '—'} amber={row.demand > 0} />
      </div>
    </div>
  );
}

function Metric({ label, value, accent, amber }: { label: string; value: string; accent?: boolean; amber?: boolean }) {
  return (
    <div className={`rounded-lg p-2 ${amber ? 'bg-amber-50' : 'bg-navy/5'}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-navy/40">{label}</p>
      <p className={`text-sm font-bold ${accent ? 'text-green-600' : amber ? 'text-amber-700' : 'text-navy'}`}>{value}</p>
    </div>
  );
}
