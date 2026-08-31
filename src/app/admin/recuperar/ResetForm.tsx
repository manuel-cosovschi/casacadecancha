'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Pantalla a la que lleva el link del mail de recuperación.
 * Supabase deja la sesión de recuperación al abrir el link; acá sólo
 * se define la contraseña nueva.
 */
export function ResetForm() {
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      // Flujo PKCE: el link vuelve con ?code=...
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          setValid(true);
          setReady(true);
          return;
        }
      }
      // Flujo con tokens en el # (por si el proyecto no usa PKCE).
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!error) {
          setValid(true);
          setReady(true);
          return;
        }
      }
      // Puede que la sesión ya esté puesta por el propio link.
      const { data } = await supabase.auth.getUser();
      setValid(Boolean(data.user));
      setReady(true);
    }

    init();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Usá al menos 8 caracteres.');
      return;
    }
    if (password !== repeat) {
      setError('Las dos contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError('No se pudo cambiar la contraseña. Pedí un link nuevo desde el login.');
      return;
    }
    window.location.href = '/admin';
  }

  if (!ready) {
    return <p className="mt-4 text-center text-sm text-navy/55">Verificando el link…</p>;
  }

  if (!valid) {
    return (
      <div className="mt-4 text-center">
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Este link no sirve o ya venció. Los links duran poco: pedí uno nuevo desde el login.
        </p>
        <a href="/admin/login" className="btn-primary mt-4 w-full">
          Volver al login
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <label className="block">
        <span className="label">Contraseña nueva</span>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
        />
      </label>
      <label className="block">
        <span className="label">Repetila</span>
        <input
          type="password"
          className="input"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value)}
          required
          autoComplete="new-password"
        />
      </label>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? 'Guardando…' : 'Guardar y entrar'}
      </button>
    </form>
  );
}
