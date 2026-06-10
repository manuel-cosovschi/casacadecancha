'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSetting } from '@/app/admin/(panel)/_settings-actions';

interface Msg {
  text: string;
  active: boolean;
}

export function AnnouncementEditor({ initial }: { initial: { active: boolean; messages: Msg[] } }) {
  const router = useRouter();
  const [active, setActive] = useState(initial?.active ?? true);
  const [messages, setMessages] = useState<Msg[]>(initial?.messages ?? []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function update(i: number, patch: Partial<Msg>) {
    setMessages((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }
  function move(i: number, dir: -1 | 1) {
    setMessages((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await updateSetting('announcement_bar', { active, messages });
    setBusy(false);
    setMsg(res.error || 'Guardado ✓');
    if (!res.error) router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">Barra de anuncios</h2>
      <label className="mb-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
        Barra activa
      </label>
      <div className="space-y-2">
        {messages.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={m.text}
              onChange={(e) => update(i, { text: e.target.value })}
              className="input flex-1 !py-1.5"
            />
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={m.active} onChange={(e) => update(i, { active: e.target.checked })} className="h-4 w-4" />
              Activo
            </label>
            <button onClick={() => move(i, -1)} className="px-1 text-navy/50">↑</button>
            <button onClick={() => move(i, 1)} className="px-1 text-navy/50">↓</button>
            <button onClick={() => setMessages((p) => p.filter((_, idx) => idx !== i))} className="text-xs text-red-600">×</button>
          </div>
        ))}
      </div>
      <button
        onClick={() => setMessages((p) => [...p, { text: '', active: true }])}
        className="mt-3 text-sm font-semibold text-navy hover:underline"
      >
        + Agregar mensaje
      </button>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
        {msg && <span className="text-sm text-navy/60">{msg}</span>}
      </div>
    </div>
  );
}
