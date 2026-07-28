'use client';

import { useState } from 'react';
import type { EncargoRequest } from '@/lib/types';
import { formatPrice, whatsappLink } from '@/lib/utils';
import { StatusBadge } from '@/components/admin/ui';
import {
  approveEncargoRequest,
  rejectEncargoRequest,
  reopenEncargoRequest,
} from './actions';

/** Normaliza un teléfono argentino a formato wa.me (con código de país). */
function waNumber(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('54')) return digits;
  // Sin código de país: asumimos Argentina móvil (54 9 …).
  return `549${digits.replace(/^0/, '').replace(/^15/, '')}`;
}

function itemsText(req: EncargoRequest): string {
  return req.items.map((i) => `• ${i.quantity}x ${i.product} (talle ${i.size})`).join('\n');
}

function approveMessage(req: EncargoRequest, quote: number, deposit: number): string {
  const entrega =
    req.delivery_method === 'envio'
      ? 'El envío está incluido en la cotización, coordinamos el despacho.'
      : 'Es con retiro en la zona de Av. Constitución (Mar del Plata). Coordinamos por WhatsApp un par de días antes de la entrega.';
  return [
    `¡Hola ${req.customer_name}! 👋 Tu encargo #${req.request_number} en Casaca de Cancha fue APROBADO ✅`,
    '',
    '📦 Tu pedido:',
    itemsText(req),
    '',
    `💵 Cotización total: ${formatPrice(quote)}`,
    `🔒 Seña para reservarlo (50%): ${formatPrice(deposit)}`,
    `📅 Entrega estimada: aprox. 7 días hábiles desde que abonás la seña.`,
    '',
    entrega,
    '',
    'Para reservarlo aboná la seña y te lo dejamos separado. ¿Avanzamos? 🙌',
  ].join('\n');
}

function rejectMessage(req: EncargoRequest, reason: string): string {
  return [
    `¡Hola ${req.customer_name}! Gracias por tu encargo #${req.request_number} en Casaca de Cancha 🙏`,
    'Por el momento no vamos a poder avanzar con este pedido.',
    `Motivo: ${reason}`,
    '',
    'Cualquier otra camiseta que estés buscando, escribinos y lo vemos. ¡Saludos! 💙',
  ].join('\n');
}

function WhatsAppButton({ phone, message }: { phone: string; message: string }) {
  const num = waNumber(phone);
  if (!num) return null;
  return (
    <a
      href={whatsappLink(num, message)}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-wsp w-full"
    >
      Enviar por WhatsApp
    </a>
  );
}

function RequestCard({ req }: { req: EncargoRequest }) {
  const [quote, setQuote] = useState<string>(req.quote_amount ? String(req.quote_amount) : '');
  const [reason, setReason] = useState<string>(req.reject_reason || '');
  const [mode, setMode] = useState<'none' | 'approve' | 'reject'>('none');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quoteNum = Math.max(0, Math.round(Number(quote) || 0));
  const depositNum = req.deposit_amount ?? Math.round(quoteNum / 2);

  const fecha = new Date(req.created_at).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });

  async function doApprove() {
    setError(null);
    if (quoteNum <= 0) {
      setError('Ingresá el monto de la cotización.');
      return;
    }
    setLoading(true);
    const res = await approveEncargoRequest(req.id, quoteNum);
    setLoading(false);
    if (!res.ok) setError(res.error || 'No se pudo aprobar.');
    else setMode('none');
  }

  async function doReject() {
    setError(null);
    if (reason.trim().length < 3) {
      setError('Escribí el motivo del rechazo.');
      return;
    }
    setLoading(true);
    const res = await rejectEncargoRequest(req.id, reason.trim());
    setLoading(false);
    if (!res.ok) setError(res.error || 'No se pudo rechazar.');
    else setMode('none');
  }

  async function doReopen() {
    setLoading(true);
    await reopenEncargoRequest(req.id);
    setLoading(false);
    setMode('none');
  }

  return (
    <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-card">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-navy">#{req.request_number}</span>
            <StatusBadge status={req.status} />
          </div>
          <p className="mt-0.5 text-xs text-navy/50">{fecha}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-bold text-navy">{req.customer_name}</p>
          <p className="text-navy/60">{req.customer_phone}</p>
        </div>
      </div>

      {/* Items */}
      <ul className="mt-3 space-y-1 rounded-xl bg-navy/[0.03] p-3 text-sm text-navy/80">
        {req.items.map((i, idx) => (
          <li key={idx}>
            <strong>{i.quantity}x</strong> {i.product} <span className="text-navy/50">· talle {i.size}</span>
          </li>
        ))}
      </ul>

      {/* Entrega */}
      <div className="mt-3 text-sm text-navy/70">
        {req.delivery_method === 'envio' ? (
          <p>
            🚚 <strong>Envío</strong> a {[req.address, req.city, req.province].filter(Boolean).join(', ') || '—'}
            {req.postal_code ? ` (CP ${req.postal_code})` : ''}
          </p>
        ) : (
          <p>🏠 <strong>Retiro</strong> — zona Av. Constitución (a coordinar)</p>
        )}
        {req.customer_email && <p className="text-navy/50">✉️ {req.customer_email}</p>}
        {req.dni && <p className="text-navy/50">DNI: {req.dni}</p>}
        {req.notes && <p className="mt-1 italic text-navy/60">“{req.notes}”</p>}
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm font-medium text-red-600">{error}</p>
      )}

      {/* Acciones según estado */}
      {req.status === 'pendiente' && mode === 'none' && (
        <div className="mt-4 flex gap-2">
          <button onClick={() => setMode('approve')} className="btn-celeste flex-1">
            Aprobar / cotizar
          </button>
          <button
            onClick={() => setMode('reject')}
            className="btn-outline flex-1 !border-red-200 !text-red-600 hover:!bg-red-600 hover:!text-white"
          >
            Rechazar
          </button>
        </div>
      )}

      {req.status === 'pendiente' && mode === 'approve' && (
        <div className="mt-4 space-y-3 rounded-xl border border-celeste/30 bg-celeste/5 p-3">
          <div>
            <label className="label">Cotización total (incluye envío si corresponde)</label>
            <input
              type="number"
              className="input"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Ej: 130000"
              autoFocus
            />
          </div>
          {quoteNum > 0 && (
            <p className="text-sm text-navy/70">
              Seña (50%): <strong>{formatPrice(depositNum)}</strong> · Entrega ~7 días hábiles
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={doApprove} disabled={loading} className="btn-primary flex-1">
              {loading ? 'Guardando…' : 'Confirmar aprobación'}
            </button>
            <button onClick={() => setMode('none')} className="btn-outline">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {req.status === 'pendiente' && mode === 'reject' && (
        <div className="mt-4 space-y-3 rounded-xl border border-red-200 bg-red-50 p-3">
          <div>
            <label className="label">Motivo del rechazo</label>
            <textarea
              className="input min-h-16"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: no conseguimos ese modelo / no hay stock del proveedor…"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button onClick={doReject} disabled={loading} className="btn-primary flex-1 !bg-red-600 hover:!bg-red-700">
              {loading ? 'Guardando…' : 'Confirmar rechazo'}
            </button>
            <button onClick={() => setMode('none')} className="btn-outline">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Aprobado: resumen + WhatsApp */}
      {req.status === 'aprobado' && (
        <div className="mt-4 space-y-3 rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-navy/80">
            💵 Cotización: <strong>{formatPrice(req.quote_amount || 0)}</strong> · 🔒 Seña:{' '}
            <strong>{formatPrice(req.deposit_amount || 0)}</strong>
          </p>
          <WhatsAppButton
            phone={req.customer_phone}
            message={approveMessage(req, req.quote_amount || 0, req.deposit_amount || 0)}
          />
          <button onClick={doReopen} disabled={loading} className="text-xs text-navy/50 hover:underline">
            Volver a pendiente
          </button>
        </div>
      )}

      {/* Rechazado: resumen + WhatsApp */}
      {req.status === 'rechazado' && (
        <div className="mt-4 space-y-3 rounded-xl border border-navy/10 bg-navy/[0.03] p-3">
          <p className="text-sm text-navy/70">Motivo: {req.reject_reason}</p>
          <WhatsAppButton
            phone={req.customer_phone}
            message={rejectMessage(req, req.reject_reason || '')}
          />
          <button onClick={doReopen} disabled={loading} className="text-xs text-navy/50 hover:underline">
            Volver a pendiente
          </button>
        </div>
      )}
    </div>
  );
}

export function RequestsList({ requests }: { requests: EncargoRequest[] }) {
  const pendientes = requests.filter((r) => r.status === 'pendiente');
  const resueltos = requests.filter((r) => r.status !== 'pendiente');

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/50">
          Pendientes ({pendientes.length})
        </h2>
        {pendientes.length === 0 ? (
          <p className="rounded-xl border border-dashed border-navy/15 p-6 text-center text-sm text-navy/50">
            No hay encargos pendientes de cotizar.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendientes.map((r) => (
              <RequestCard key={r.id} req={r} />
            ))}
          </div>
        )}
      </section>

      {resueltos.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-navy/50">
            Resueltos ({resueltos.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {resueltos.map((r) => (
              <RequestCard key={r.id} req={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
