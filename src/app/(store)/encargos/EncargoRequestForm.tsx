'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createEncargoRequest } from './actions';

type ItemRow = { product: string; size: string; quantity: number };

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'Niño'];
const MIN_QTY = 2;

const emptyItem = (): ItemRow => ({ product: '', size: 'M', quantity: 1 });

export function EncargoRequestForm() {
  const [items, setItems] = useState<ItemRow[]>([emptyItem(), emptyItem()]);
  const [delivery, setDelivery] = useState<'envio' | 'retiro'>('envio');
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    dni: '',
    province: '',
    city: '',
    address: '',
    postal_code: '',
    notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const totalQty = useMemo(
    () => items.reduce((a, i) => a + (Number(i.quantity) || 0), 0),
    [items],
  );

  const setItem = (idx: number, patch: Partial<ItemRow>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx: number) =>
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanItems = items
      .map((i) => ({ ...i, product: i.product.trim(), size: i.size.trim() }))
      .filter((i) => i.product.length > 0);

    if (cleanItems.length === 0) {
      setError('Agregá al menos una camiseta a tu encargo.');
      return;
    }
    if (cleanItems.reduce((a, i) => a + (Number(i.quantity) || 0), 0) < MIN_QTY) {
      setError(`El encargo tiene que ser de al menos ${MIN_QTY} prendas.`);
      return;
    }

    setLoading(true);
    const res = await createEncargoRequest({
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      customer_email: form.customer_email || '',
      dni: form.dni,
      delivery_method: delivery,
      province: form.province,
      city: form.city,
      address: form.address,
      postal_code: form.postal_code,
      notes: form.notes,
      items: cleanItems.map((i) => ({
        product: i.product,
        size: i.size,
        quantity: Math.max(1, Number(i.quantity) || 1),
      })),
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error || 'No se pudo enviar el encargo.');
      return;
    }
    setDone(res.requestNumber || '');
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-navy/10 bg-white p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
          ✅
        </div>
        <h2 className="text-2xl font-extrabold text-navy">¡Encargo enviado!</h2>
        <p className="mt-2 text-navy/70">
          Tu encargo <strong>#{done}</strong> quedó registrado para cotizar. Lo evaluamos y te
          contactamos por WhatsApp con el presupuesto, la seña para reservar y la fecha estimada de
          entrega.
        </p>
        <p className="mt-4 rounded-xl bg-cream-soft p-3 text-sm text-navy/70">
          📅 Entrega estimada aprox. <strong>7 días hábiles</strong> desde que abonás la seña.
        </p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Columna izquierda: armado del encargo + datos */}
      <div className="space-y-6">
        {/* Items */}
        <section className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
          <h2 className="text-lg font-extrabold text-navy">1. ¿Qué camisetas querés?</h2>
          <p className="mt-1 text-sm text-navy/60">
            Escribí el equipo/modelo, el talle y la cantidad. Mínimo <strong>2 prendas</strong> en
            total.
          </p>

          <div className="mt-4 space-y-3">
            {items.map((it, idx) => (
              <div key={idx} className="flex flex-wrap items-end gap-2">
                <div className="min-w-[180px] flex-1">
                  {idx === 0 && <label className="label">Camiseta / modelo</label>}
                  <input
                    className="input"
                    placeholder="Ej: Boca titular 24/25, Argentina retro…"
                    value={it.product}
                    onChange={(e) => setItem(idx, { product: e.target.value })}
                  />
                </div>
                <div className="w-24">
                  {idx === 0 && <label className="label">Talle</label>}
                  <select
                    className="input"
                    value={it.size}
                    onChange={(e) => setItem(idx, { size: e.target.value })}
                  >
                    {SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-20">
                  {idx === 0 && <label className="label">Cant.</label>}
                  <input
                    type="number"
                    min={1}
                    max={50}
                    className="input"
                    value={it.quantity}
                    onChange={(e) =>
                      setItem(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  disabled={items.length <= 1}
                  className="mb-0.5 rounded-lg border border-navy/10 px-3 py-2.5 text-sm text-navy/50 transition hover:border-red-300 hover:text-red-600 disabled:opacity-30"
                  aria-label="Quitar"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 text-sm font-semibold text-celeste-bright hover:underline"
          >
            + Agregar otra camiseta
          </button>

          <p className="mt-3 text-sm font-semibold text-navy/70">
            Total: {totalQty} prenda(s){' '}
            {totalQty < MIN_QTY && (
              <span className="text-red-500">— faltan {MIN_QTY - totalQty} para el mínimo</span>
            )}
          </p>
        </section>

        {/* Datos del cliente */}
        <section className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
          <h2 className="text-lg font-extrabold text-navy">2. Tus datos</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Nombre y apellido</label>
              <input
                className="input"
                value={form.customer_name}
                onChange={(e) => set('customer_name', e.target.value)}
                placeholder="Tu nombre completo"
              />
            </div>
            <div>
              <label className="label">WhatsApp</label>
              <input
                className="input"
                value={form.customer_phone}
                onChange={(e) => set('customer_phone', e.target.value)}
                placeholder="Ej: 2235123456"
              />
            </div>
            <div>
              <label className="label">Email (opcional)</label>
              <input
                className="input"
                type="email"
                value={form.customer_email}
                onChange={(e) => set('customer_email', e.target.value)}
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="label">DNI (opcional)</label>
              <input
                className="input"
                value={form.dni}
                onChange={(e) => set('dni', e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Entrega */}
        <section className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
          <h2 className="text-lg font-extrabold text-navy">3. Entrega</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setDelivery('envio')}
              className={`rounded-xl border-2 p-3.5 text-left transition ${
                delivery === 'envio'
                  ? 'border-celeste bg-celeste/10'
                  : 'border-navy/10 hover:border-navy/25'
              }`}
            >
              <p className="font-bold text-navy">🚚 Con envío</p>
              <p className="text-xs text-navy/60">Te cotizamos el envío según dónde vivís.</p>
            </button>
            <button
              type="button"
              onClick={() => setDelivery('retiro')}
              className={`rounded-xl border-2 p-3.5 text-left transition ${
                delivery === 'retiro'
                  ? 'border-celeste bg-celeste/10'
                  : 'border-navy/10 hover:border-navy/25'
              }`}
            >
              <p className="font-bold text-navy">🏠 Retiro</p>
              <p className="text-xs text-navy/60">Zona Av. Constitución (Mar del Plata).</p>
            </button>
          </div>

          {delivery === 'envio' ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Provincia</label>
                <input
                  className="input"
                  value={form.province}
                  onChange={(e) => set('province', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Ciudad / localidad</label>
                <input
                  className="input"
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Dirección</label>
                <input
                  className="input"
                  value={form.address}
                  onChange={(e) => set('address', e.target.value)}
                  placeholder="Calle y altura"
                />
              </div>
              <div>
                <label className="label">Código postal</label>
                <input
                  className="input"
                  value={form.postal_code}
                  onChange={(e) => set('postal_code', e.target.value)}
                />
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-cream-soft p-3 text-sm text-navy/70">
              El retiro es en la <strong>zona de Av. Constitución (Mar del Plata)</strong>.
              Coordinamos el punto y horario exacto por WhatsApp un par de días antes de la entrega.
            </p>
          )}

          <div className="mt-4">
            <label className="label">Comentarios (opcional)</label>
            <textarea
              className="input min-h-20"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Detalles, aclaraciones, versión, parches, etc."
            />
          </div>
        </section>
      </div>

      {/* Columna derecha: resumen + envío */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
          <h2 className="text-lg font-extrabold text-navy">Tu encargo</h2>
          <p className="mt-1 text-sm text-navy/60">
            Lo mandás a cotizar sin compromiso. Te respondemos por WhatsApp con:
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-navy/75">
            <li>💵 Precio cotizado</li>
            <li>🔒 Seña del 50% para reservar</li>
            <li>📅 Entrega estimada ~7 días hábiles</li>
          </ul>

          <div className="mt-4 rounded-xl bg-navy/5 p-3 text-sm text-navy/70">
            {totalQty} prenda(s) · {delivery === 'envio' ? 'Con envío' : 'Retiro'}
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary mt-4 w-full">
            {loading ? 'Enviando…' : 'Enviar a cotizar'}
          </button>
          <p className="mt-2 text-center text-xs text-navy/45">
            No se cobra nada ahora. Solo pagás la seña si aprobás el presupuesto.
          </p>
        </div>
      </aside>
    </form>
  );
}
