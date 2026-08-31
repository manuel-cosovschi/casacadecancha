'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const params = useSearchParams();
  const redirectTo = params.get('redirect') || '/admin';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);

  /** Manda el mail de recuperación (lo envía Supabase, no depende de la web). */
  async function onReset() {
    setError(null);
    const email = username.trim();
    if (!email.includes('@')) {
      setError('Escribí tu email arriba y volvé a tocar “Olvidé mi contraseña”.');
      return;
    }
    setResetting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/recuperar`,
    });
    setResetting(false);
    if (error) {
      setError('No se pudo enviar el mail. Probá de nuevo en unos minutos.');
      return;
    }
    setResetSent(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    // Si escribe un email lo usamos directo; si no, resolvemos el usuario a su email.
    let email = username.trim();
    if (!email.includes('@')) {
      const { data } = await supabase.rpc('auth_email_for_username', { p_username: email });
      if (!data) {
        setError('Usuario o contraseña incorrectos.');
        setLoading(false);
        return;
      }
      email = data as string;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Usuario o contraseña incorrectos.');
      setLoading(false);
      return;
    }
    // Recarga completa para que el panel cargue con el usuario correcto (sin caché previa).
    window.location.href = redirectTo;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="label">Usuario</span>
        <input
          type="text"
          className="input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoComplete="username"
          autoCapitalize="none"
          placeholder="tu usuario"
        />
      </label>
      <label className="block">
        <span className="label">Contraseña</span>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>

      {resetSent ? (
        <p className="rounded-lg bg-green-50 p-3 text-center text-sm text-green-800">
          ✅ Te mandamos un mail con el link para poner una contraseña nueva. Revisá también el
          correo no deseado.
        </p>
      ) : (
        <button
          type="button"
          onClick={onReset}
          disabled={resetting}
          className="w-full text-center text-sm font-semibold text-navy/55 hover:text-navy hover:underline"
        >
          {resetting ? 'Enviando…' : 'Olvidé mi contraseña'}
        </button>
      )}
    </form>
  );
}
