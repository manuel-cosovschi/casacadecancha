'use client';

import { useState, useTransition } from 'react';
import { altaManualSocio } from './actions';
import { SOCIO } from '@/lib/socios';

/**
 * Dar de alta un socio a mano.
 *
 * Para el que paga la cuota en efectivo o por transferencia —en una tienda de
 * barrio son varios— y para probar el carnet: Mercado Pago no deja pagarle a
 * la propia cuenta, así que el dueño no puede darse de alta por la web.
 *
 * Suma días igual que un pago y manda el mismo mail de bienvenida: para el
 * socio no hay ninguna diferencia con haberlo pagado por la página.
 */
export function AltaManual({ sugerido }: { sugerido?: string }) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState(sugerido || '');
  const [telefono, setTelefono] = useState('');
  const [dias, setDias] = useState(String(SOCIO.dias));
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendiente, startTransition] = useTransition();

  if (!abierto) {
    return (
      <button onClick={() => setAbierto(true)} className="btn-outline">
        Dar de alta a mano
      </button>
    );
  }

  return (
    <div className="card w-full max-w-xl space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
            Alta manual de socio
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-navy/55">
            Para el que te paga la cuota en efectivo o por transferencia. Le suma los días y le
            llega el mismo mail con su número de socio que si hubiera pagado por la página.
          </p>
        </div>
        <button onClick={() => setAbierto(false)} className="text-xs text-navy/50 hover:underline">
          Cerrar
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="am-nombre" className="label">Nombre</label>
          <input id="am-nombre" className="input" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div>
          <label htmlFor="am-email" className="label">Email</label>
          <input id="am-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label htmlFor="am-tel" className="label">Teléfono</label>
          <input id="am-tel" type="tel" className="input" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <div>
          <label htmlFor="am-dias" className="label">Días de carnet</label>
          <input
            id="am-dias"
            type="number"
            min={1}
            max={365}
            className="input"
            value={dias}
            onChange={(e) => setDias(e.target.value)}
          />
        </div>
      </div>

      {msg && (
        <p
          className={`rounded-lg p-3 text-sm font-medium ${
            msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {msg.texto}
        </p>
      )}

      <button
        className="btn-primary"
        disabled={pendiente}
        onClick={() =>
          startTransition(async () => {
            setMsg(null);
            const r = await altaManualSocio({
              email,
              nombre,
              telefono,
              dias: Number(dias) || SOCIO.dias,
            });
            setMsg(
              r.ok
                ? {
                    ok: true,
                    texto: `Listo. Socio N° ${String(r.numero ?? 0).padStart(3, '0')}${
                      r.pagaHasta
                        ? ` — al día hasta el ${new Date(r.pagaHasta).toLocaleDateString('es-AR')}`
                        : ''
                    }.`,
                  }
                : { ok: false, texto: r.error || 'No se pudo.' },
            );
            if (r.ok) { setNombre(''); setEmail(''); setTelefono(''); }
          })
        }
      >
        {pendiente ? 'Dando de alta…' : 'Dar de alta'}
      </button>
    </div>
  );
}
