'use client';

import { useState } from 'react';
import { mandarMailDePrueba, type EstadoEmail } from '@/app/admin/(panel)/configuracion/email-actions';

function Fila({ ok, children }: { ok: boolean | null; children: React.ReactNode }) {
  const icono = ok === null ? '?' : ok ? '✓' : '✕';
  const color = ok === null ? 'text-navy/40' : ok ? 'text-green-600' : 'text-red-600';
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={color}>{icono}</span>
      <span className="text-navy/70">{children}</span>
    </li>
  );
}

/**
 * Estado del envío de mails + prueba real.
 *
 * Existe por un caso concreto: sin un dominio verificado en Resend, los avisos
 * al dueño llegan y los códigos a los clientes los rechaza el servidor. Visto
 * de afuera se ve idéntico a "se suscriben y no compran", así que hace falta
 * poder comprobarlo mandando un mail a una dirección de afuera.
 */
export function EmailStatus({ estado }: { estado: EstadoEmail }) {
  const [destino, setDestino] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; mensaje: string } | null>(null);

  async function probar() {
    setBusy(true);
    setRes(null);
    setRes(await mandarMailDePrueba(destino));
    setBusy(false);
  }

  // Roto de verdad: o mandamos desde el remitente de pruebas, o desde un
  // dominio que Resend no tiene verificado. En los dos casos, los mails a
  // clientes no salen.
  const roto = estado.remitenteDePrueba || estado.dominioVerificado === false;

  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">
        Envío de mails
      </h2>

      {roto && (
        <div className="mb-4 rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-700">
            ⚠️ Los mails a tus clientes no están saliendo
          </p>
          <p className="mt-1 text-sm text-red-900/80">
            {estado.remitenteDePrueba ? (
              <>
                Estás mandando desde <code>onboarding@resend.dev</code>, que solo entrega
                a tu propia casilla.
              </>
            ) : (
              <>
                Resend no tiene verificado <strong>{estado.dominio}</strong>, así que
                rechaza todo lo que mandes desde ahí.
              </>
            )}{' '}
            Los avisos de suscriptor te llegan igual, pero{' '}
            <strong>los códigos de descuento a los clientes no</strong>.
          </p>
          <p className="mt-2 text-sm text-red-900/80">
            Para arreglarlo: en Resend, <strong>Domains → Add domain</strong> con{' '}
            <strong>casacadecancha.shop</strong>, cargá en tu DNS los registros que te da
            (SPF y DKIM), esperá a que quede <em>verified</em>, y después poné{' '}
            <code>EMAIL_FROM</code> en Vercel, por ejemplo{' '}
            <code>Casaca de Cancha &lt;hola@casacadecancha.shop&gt;</code>.
          </p>
          <p className="mt-2 text-sm text-red-900/80">
            Mientras tanto, los códigos de quienes ya se suscribieron los tenés en{' '}
            <strong>Marketing</strong> para mandarlos a mano.
          </p>
        </div>
      )}

      <ul className="space-y-1.5">
        <Fila ok={estado.activo}>
          {estado.activo ? 'Resend conectado.' : 'Falta RESEND_API_KEY: no sale ningún mail.'}
        </Fila>
        <Fila ok={!estado.remitenteDePrueba}>
          Remitente: <code className="text-navy">{estado.remitente}</code>
        </Fila>
        <Fila ok={estado.dominioVerificado}>
          {estado.dominioVerificado === null
            ? `No se pudo preguntarle a Resend qué dominios tenés verificados${estado.errorDominios ? ` (${estado.errorDominios})` : ''}.`
            : estado.dominioVerificado
              ? `Resend tiene verificado ${estado.dominio}.`
              : `Resend NO tiene verificado ${estado.dominio}.`}
        </Fila>
        <Fila ok={estado.puedeFirmarCodigos}>
          {estado.puedeFirmarCodigos
            ? 'Los códigos de descuento se pueden firmar.'
            : 'Falta WELCOME_SECRET (o CRON_SECRET): no se emiten códigos.'}
        </Fila>
        <Fila ok={estado.avisoConfigurado}>
          {estado.avisoConfigurado
            ? 'Te llega un aviso por cada suscriptor nuevo.'
            : 'Falta ADMIN_EMAIL: no te avisamos de los suscriptores.'}
        </Fila>
      </ul>

      {estado.dominios && estado.dominios.length > 0 && (
        <p className="mt-3 text-xs text-navy/50">
          Dominios en tu cuenta de Resend:{' '}
          {estado.dominios.map((d) => `${d.nombre} (${d.estado})`).join(' · ')}
        </p>
      )}
      {estado.dominios?.length === 0 && (
        <p className="mt-3 text-xs text-navy/50">
          Tu cuenta de Resend no tiene ningún dominio cargado todavía.
        </p>
      )}

      <div className="mt-5 border-t border-navy/10 pt-4">
        <label className="block">
          <span className="label">Probar con un mail de afuera</span>
          <input
            type="email"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="el mail de un amigo, no el tuyo"
            className="input"
          />
          <span className="mt-1 block text-xs text-navy/50">
            Tiene que ser una casilla que no sea la tuya: al mail propio llega
            igual aunque el remitente esté sin verificar, así que probar con el
            tuyo no dice nada.
          </span>
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button onClick={probar} disabled={busy || !destino} className="btn-primary">
            {busy ? 'Mandando…' : 'Mandar mail de prueba'}
          </button>
          {res && (
            <span className={`text-sm ${res.ok ? 'text-green-700' : 'text-red-700'}`}>
              {res.mensaje}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
