'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { guardarPresupuesto } from '@/app/admin/(panel)/presupuestos/actions';
import { calcular, itemsValidos, type ItemPresupuesto, type TipoDescuento } from '@/lib/presupuesto';
import { formatPrice } from '@/lib/utils';

const VACIO: ItemPresupuesto = { nombre: '', cantidad: 1, precio: 0 };

/**
 * Armar un presupuesto para mandar por WhatsApp.
 *
 * La cuenta se muestra mientras se escribe: el precio se negocia en la
 * conversación, así que hay que poder mover el descuento y ver el total y la
 * seña sin apretar nada.
 */
export function PresupuestoForm() {
  const router = useRouter();
  const [cliente, setCliente] = useState('');
  const [contacto, setContacto] = useState('');
  const [items, setItems] = useState<ItemPresupuesto[]>([{ ...VACIO }, { ...VACIO }]);
  const [descuentoTipo, setDescuentoTipo] = useState<TipoDescuento>('porcentaje');
  const [descuentoValor, setDescuentoValor] = useState(0);
  const [extraLabel, setExtraLabel] = useState('');
  const [extraMonto, setExtraMonto] = useState(0);
  const [senaPct, setSenaPct] = useState(50);
  const [validoDias, setValidoDias] = useState(7);
  const [notas, setNotas] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cuenta = useMemo(
    () => calcular({ items, descuentoTipo, descuentoValor, extraMonto, senaPct }),
    [items, descuentoTipo, descuentoValor, extraMonto, senaPct],
  );
  const cuantos = itemsValidos(items).reduce((a, i) => a + Math.max(1, i.cantidad || 1), 0);

  function set(i: number, campo: keyof ItemPresupuesto, valor: string) {
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i
          ? { ...it, [campo]: campo === 'nombre' ? valor : Number(valor.replace(/[^\d.]/g, '')) || 0 }
          : it,
      ),
    );
  }

  async function generar() {
    setBusy(true);
    setError(null);
    const res = await guardarPresupuesto({
      cliente,
      contacto,
      items,
      descuentoTipo,
      descuentoValor,
      extraLabel,
      extraMonto,
      senaPct,
      notas,
      validoDias,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    // Se abre la hoja lista para guardar como PDF.
    router.push(`/admin/presupuesto/${res.numero}`);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {/* Cliente */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">
            Para quién es
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Nombre del cliente</span>
              <input
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Juan Pérez"
                className="input"
              />
            </label>
            <label className="block">
              <span className="label">WhatsApp (opcional)</span>
              <input
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="2235555555"
                className="input"
              />
            </label>
          </div>
        </div>

        {/* Camisetas */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">
            Las camisetas
          </h2>
          <div className="space-y-3">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[1fr_64px_110px_32px] items-end gap-2">
                <label className="block">
                  {i === 0 && <span className="label">Camiseta</span>}
                  <input
                    value={it.nombre}
                    onChange={(e) => set(i, 'nombre', e.target.value)}
                    placeholder="Ej: Boca titular 24/25"
                    className="input"
                  />
                </label>
                <label className="block">
                  {i === 0 && <span className="label">Cant.</span>}
                  <input
                    inputMode="numeric"
                    value={it.cantidad || ''}
                    onChange={(e) => set(i, 'cantidad', e.target.value)}
                    placeholder="1"
                    className="input text-center"
                  />
                </label>
                <label className="block">
                  {i === 0 && <span className="label">Precio c/u</span>}
                  <input
                    inputMode="numeric"
                    value={it.precio || ''}
                    onChange={(e) => set(i, 'precio', e.target.value)}
                    placeholder="60000"
                    className="input text-right"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                  disabled={items.length <= 1}
                  aria-label="Quitar"
                  className="mb-1 h-9 rounded-lg text-navy/30 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setItems((p) => [...p, { ...VACIO }])}
            className="mt-3 text-sm font-semibold text-celeste-bright hover:underline"
          >
            + Agregar otra camiseta
          </button>
        </div>

        {/* Ajustes */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">
            Descuento, extras y seña
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Descuento sobre el total</span>
              <div className="flex gap-2">
                <input
                  inputMode="numeric"
                  value={descuentoValor || ''}
                  onChange={(e) => setDescuentoValor(Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
                  placeholder="0"
                  className="input text-right"
                />
                <select
                  value={descuentoTipo}
                  onChange={(e) => setDescuentoTipo(e.target.value as TipoDescuento)}
                  className="input w-24"
                >
                  <option value="porcentaje">%</option>
                  <option value="monto">$</option>
                </select>
              </div>
            </label>

            <label className="block">
              <span className="label">Seña (%)</span>
              <input
                inputMode="numeric"
                value={senaPct}
                onChange={(e) => setSenaPct(Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
                className="input"
              />
              <span className="mt-1 block text-xs text-navy/50">
                Lo que tiene que pasarte ahora para reservar.
              </span>
            </label>

            <label className="block">
              <span className="label">Costo extra (opcional)</span>
              <input
                value={extraLabel}
                onChange={(e) => setExtraLabel(e.target.value)}
                placeholder="Ej: Envío al interior"
                className="input"
              />
            </label>
            <label className="block">
              <span className="label">Monto del extra</span>
              <input
                inputMode="numeric"
                value={extraMonto || ''}
                onChange={(e) => setExtraMonto(Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
                placeholder="0"
                className="input text-right"
              />
            </label>

            <label className="block">
              <span className="label">Vale por (días)</span>
              <input
                inputMode="numeric"
                value={validoDias}
                onChange={(e) => setValidoDias(Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
                className="input"
              />
              <span className="mt-1 block text-xs text-navy/50">
                Los precios de importado se mueven: poner un vencimiento te cubre.
              </span>
            </label>
            <label className="block sm:col-span-2">
              <span className="label">Notas para el cliente (opcional)</span>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Entrega estimada 7 días hábiles desde la seña."
                className="input min-h-20"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Resumen pegajoso */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/60">
            Cómo queda
          </h2>
          <dl className="space-y-1.5 text-sm">
            <Row
              label={`Subtotal${cuantos ? ` (${cuantos} ${cuantos === 1 ? 'prenda' : 'prendas'})` : ''}`}
              value={formatPrice(cuenta.subtotal)}
            />
            {cuenta.descuento > 0 && (
              <Row
                label={
                  descuentoTipo === 'porcentaje' ? `Descuento ${descuentoValor}%` : 'Descuento'
                }
                value={`− ${formatPrice(cuenta.descuento)}`}
                verde
              />
            )}
            {cuenta.extra > 0 && (
              <Row label={extraLabel.trim() || 'Extra'} value={`+ ${formatPrice(cuenta.extra)}`} />
            )}
            <div className="flex justify-between border-t-2 border-navy pt-2">
              <dt className="font-black uppercase text-navy">Total</dt>
              <dd className="text-lg font-black text-navy">{formatPrice(cuenta.total)}</dd>
            </div>
            <div className="!mt-3 rounded-xl bg-celeste/15 p-3">
              <Row label={`Seña ${senaPct}%`} value={formatPrice(cuenta.sena)} fuerte />
              <Row label="Saldo al recibir" value={formatPrice(cuenta.saldo)} />
            </div>
          </dl>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            onClick={generar}
            disabled={busy || cuenta.subtotal === 0 || cliente.trim().length < 2}
            className="btn-primary mt-4 w-full"
          >
            {busy ? 'Generando…' : 'Generar presupuesto'}
          </button>
          <p className="mt-2 text-center text-xs text-navy/50">
            Se guarda y se abre listo para mandarlo.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  fuerte,
  verde,
}: {
  label: string;
  value: string;
  fuerte?: boolean;
  verde?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className={verde ? 'text-green-700' : 'text-navy/60'}>{label}</dt>
      <dd
        className={
          verde
            ? 'font-medium text-green-700'
            : fuerte
              ? 'font-black text-navy'
              : 'font-medium text-navy'
        }
      >
        {value}
      </dd>
    </div>
  );
}
