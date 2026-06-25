'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get('redirect') || '/admin';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    router.refresh();
    router.push(redirectTo);
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
    </form>
  );
}
