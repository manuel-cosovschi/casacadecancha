'use client';

import { useState } from 'react';
import { altaSocio } from './actions';
import { SOCIO } from '@/lib/socios';
import { formatPrice } from '@/lib/utils';

/**
 * El formulario del alta.
 *
 * Tres campos y nada más: cuantos menos, más gente termina. El teléfono está
 * porque las entregas en Mar del Plata se coordinan por WhatsApp y sin número
 * hay que salir a buscarlo.
 */
export function AltaSocioForm() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const res = await altaSocio({ nombre, email, telefono });
      if (!res.ok || !res.url) {
        setError(res.error || 'No pudimos anotarte. Probá de nuevo en un rato.');
        setEnviando(false);
        return;
      }
      // Se va a Mercado Pago. No apagamos `enviando`: mientras el navegador
      // cambia de página el botón tiene que seguir bloqueado, o alguien lo
      // aprieta dos veces y arranca dos pagos.
      window.location.href = res.url;
    } catch {
      setError('No pudimos anotarte. Probá de nuevo en un rato.');
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="card space-y-3 p-5">
      <div>
        <label htmlFor="socio-nombre" className="label">
          Tu nombre
        </label>
        <input
          id="socio-nombre"
          className="input"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="name"
          required
        />
      </div>
      <div>
        <label htmlFor="socio-email" className="label">
          Tu email
        </label>
        <input
          id="socio-email"
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <p className="mt-1 text-xs text-navy/50">
          Con este mismo mail se te aplican los beneficios en el checkout. No hace falta ningún
          código.
        </p>
      </div>
      <div>
        <label htmlFor="socio-tel" className="label">
          Tu teléfono
        </label>
        <input
          id="socio-tel"
          type="tel"
          className="input"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          autoComplete="tel"
          required
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-800">{error}</p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={enviando}>
        {enviando ? 'Abriendo el pago…' : `Sacar el carnet — ${formatPrice(SOCIO.cuota)}/mes`}
      </button>
      <p className="text-center text-xs text-navy/50">
        Se paga con Mercado Pago. Sos socio apenas se acredita.
      </p>
    </form>
  );
}
