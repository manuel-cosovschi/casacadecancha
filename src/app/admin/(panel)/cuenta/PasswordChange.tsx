'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function PasswordChange() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 8) {
      setMsg({ ok: false, text: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    if (password !== confirm) {
      setMsg({ ok: false, text: 'Las contraseñas no coinciden.' });
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: error.message });
    } else {
      setMsg({ ok: true, text: 'Contraseña actualizada correctamente.' });
      setPassword('');
      setConfirm('');
    }
  }

  return (
    <form onSubmit={submit} className="card max-w-md space-y-4 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">Cambiar contraseña</h2>
      <label className="block">
        <span className="label">Nueva contraseña</span>
        <input
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </label>
      <label className="block">
        <span className="label">Repetir contraseña</span>
        <input
          type="password"
          className="input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />
      </label>
      {msg && (
        <p className={`text-sm font-medium ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>
          {msg.text}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? 'Guardando…' : 'Actualizar contraseña'}
      </button>
    </form>
  );
}
