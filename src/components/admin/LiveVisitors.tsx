'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { enVivo, type EnVivo, type Visitante } from '@/app/admin/(panel)/en-vivo/actions';
import { formatPrice } from '@/lib/utils';

/** Cada cuánto se refresca. El storefront late cada 20s; con 5 se ve fluido. */
const REFRESCO_MS = 5000;

const ETAPAS: Record<Visitante['stage'], { texto: string; clase: string; punto: string }> = {
  mirando: { texto: 'Mirando', clase: 'bg-navy/8 text-navy/70', punto: 'bg-navy/30' },
  carrito: { texto: 'Con carrito', clase: 'bg-amber-100 text-amber-800', punto: 'bg-amber-500' },
  checkout: { texto: 'En el checkout', clase: 'bg-celeste/20 text-navy', punto: 'bg-celeste-bright' },
  compro: { texto: 'Compró', clase: 'bg-green-100 text-green-800', punto: 'bg-green-500' },
};

function haceCuanto(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 10) return 'ahora';
  if (s < 60) return `hace ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.round(m / 60)} h`;
}

function duracion(desde: string, hasta: string): string {
  const s = Math.max(0, Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

/** De dónde llegó, en criollo. */
function origen(v: Visitante): string {
  if (v.utm_source) return v.utm_source;
  const r = v.referrer || '';
  if (!r) return 'Directo';
  if (/instagram/i.test(r)) return 'Instagram';
  if (/facebook|fb\./i.test(r)) return 'Facebook';
  if (/google/i.test(r)) return 'Google';
  if (/tiktok/i.test(r)) return 'TikTok';
  if (/whatsapp|wa\.me/i.test(r)) return 'WhatsApp';
  try {
    return new URL(r).hostname.replace(/^www\./, '');
  } catch {
    return 'Directo';
  }
}

const PASOS: Record<string, string> = {
  visita: 'Entró a',
  producto: 'Miró',
  al_carrito: 'Agregó',
  checkout: 'Fue al checkout',
  compra: 'COMPRÓ',
  busqueda: 'Buscó',
  suscripcion: 'Dejó su mail',
};

function Tarjeta({ label, valor, acento }: { label: string; valor: string; acento?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-navy/50">{label}</p>
      <p className={`mt-1 text-xl font-extrabold ${acento || 'text-navy'}`}>{valor}</p>
    </div>
  );
}

function Fila({ v }: { v: Visitante }) {
  const [abierto, setAbierto] = useState(false);
  const e = ETAPAS[v.stage] ?? ETAPAS.mirando;

  return (
    <div className="border-b border-navy/5 last:border-0">
      <button
        onClick={() => setAbierto((x) => !x)}
        className="flex w-full items-start gap-3 p-3 text-left transition hover:bg-navy/[0.02]"
      >
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.punto}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`badge ${e.clase}`}>{e.texto}</span>
            <span className="truncate text-sm font-bold text-navy">
              {v.label || v.path || '—'}
            </span>
          </div>
          <p className="mt-1 text-xs text-navy/50">
            {v.device === 'movil' ? '📱 Celular' : '💻 Compu'} · desde {origen(v)} ·{' '}
            {v.pages} {v.pages === 1 ? 'página' : 'páginas'} ·{' '}
            {duracion(v.first_seen, v.last_seen)} en la tienda · {haceCuanto(v.last_seen)}
          </p>
          {v.cart_items > 0 && (
            <p className="mt-1 text-xs font-semibold text-amber-700">
              🛒 {v.cart_items} {v.cart_items === 1 ? 'producto' : 'productos'} ·{' '}
              {formatPrice(v.cart_value)}
            </p>
          )}
          {v.order_number && (
            <p className="mt-1 text-xs font-bold text-green-700">✅ Pedido {v.order_number}</p>
          )}
        </div>
        <span className="mt-1 shrink-0 text-xs text-navy/30">{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div className="bg-navy/[0.02] px-3 pb-3 pl-8">
          {v.recorrido.length === 0 ? (
            <p className="py-2 text-xs text-navy/40">Sin recorrido registrado.</p>
          ) : (
            <ol className="space-y-1 py-2">
              {v.recorrido.map((p, i) => (
                <li key={`${p.at}-${i}`} className="text-xs text-navy/60">
                  <span className="text-navy/35">{haceCuanto(p.at)}</span>{' '}
                  <span className="font-semibold text-navy/80">{PASOS[p.kind] || p.kind}</span>{' '}
                  {p.label || p.path}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Quién está en la tienda ahora mismo.
 *
 * Se refresca sola cada 5 segundos. Mientras trae los datos nuevos deja los
 * viejos en pantalla: si los borrara, la lista parpadearía a cada vuelta y no
 * se podría leer nada.
 */
export function LiveVisitors({ inicial }: { inicial: EnVivo }) {
  const [datos, setDatos] = useState(inicial);
  const [latiendo, setLatiendo] = useState(false);
  // Fuerza el re-render de los "hace X" aunque no lleguen datos nuevos.
  const [, setTic] = useState(0);
  const corriendo = useRef(false);

  const refrescar = useCallback(async () => {
    if (corriendo.current) return;
    corriendo.current = true;
    setLatiendo(true);
    try {
      setDatos(await enVivo());
    } catch {
      /* se deja lo último que sí llegó */
    } finally {
      corriendo.current = false;
      setTimeout(() => setLatiendo(false), 400);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(refrescar, REFRESCO_MS);
    const tic = setInterval(() => setTic((n) => n + 1), 1000);
    return () => {
      clearInterval(id);
      clearInterval(tic);
    };
  }, [refrescar]);

  if (datos.sinDatos) {
    return (
      <div className="card p-6 text-center">
        <p className="font-bold text-navy">Todavía no está activo el seguimiento.</p>
        <p className="mt-1 text-sm text-navy/60">
          Falta aplicar la migración <code>0038_trafico_en_vivo</code> en la base.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card relative overflow-hidden p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-navy/50">
            En la página ahora
          </p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-extrabold text-navy">
            <span className="relative flex h-3 w-3">
              {datos.ahora > 0 && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${
                  datos.ahora > 0 ? 'bg-green-500' : 'bg-navy/20'
                }`}
              />
            </span>
            {datos.ahora}
          </p>
          <p className="mt-0.5 text-xs text-navy/40">
            {latiendo ? 'actualizando…' : 'se actualiza sola'}
          </p>
        </div>
        <Tarjeta
          label="En el checkout"
          valor={String(datos.en_checkout)}
          acento={datos.en_checkout > 0 ? 'text-celeste-bright' : undefined}
        />
        <Tarjeta
          label="Con algo en el carrito"
          valor={String(datos.con_carrito)}
          acento={datos.con_carrito > 0 ? 'text-amber-600' : undefined}
        />
        <Tarjeta label="Plata en carritos" valor={formatPrice(datos.valor_en_carritos)} />
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-navy/5 p-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
            Qué está haciendo cada uno
          </h2>
          <button
            onClick={refrescar}
            className="text-xs font-semibold text-celeste-bright hover:underline"
          >
            Actualizar
          </button>
        </div>
        {datos.visitantes.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-navy/50">No hay nadie en la página en este momento.</p>
            <p className="mt-1 text-xs text-navy/35">
              Apenas entre alguien va a aparecer acá, sin que tengas que recargar.
            </p>
          </div>
        ) : (
          datos.visitantes.map((v) => <Fila key={v.id} v={v} />)
        )}
      </div>
    </div>
  );
}
