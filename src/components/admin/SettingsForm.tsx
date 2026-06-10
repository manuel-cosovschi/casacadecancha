'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSetting } from '@/app/admin/(panel)/_settings-actions';

export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select';

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  hint?: string;
  options?: { value: string; label: string }[];
  full?: boolean;
}

/** Editor genérico de un objeto plano de settings. */
export function SettingsForm({
  settingKey,
  title,
  fields,
  initial,
}: {
  settingKey: string;
  title: string;
  fields: FieldDef[];
  initial: Record<string, any>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, any>>(initial || {});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function set(key: string, value: any) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await updateSetting(settingKey, values);
    setBusy(false);
    setMsg(res.error ? res.error : 'Guardado ✓');
    if (!res.error) router.refresh();
  }

  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-navy/60">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const value = values[f.key] ?? '';
          const wrapClass = f.full ? 'sm:col-span-2' : '';
          if (f.type === 'boolean') {
            return (
              <label key={f.key} className={`flex items-center gap-2 text-sm ${wrapClass}`}>
                <input
                  type="checkbox"
                  checked={Boolean(values[f.key])}
                  onChange={(e) => set(f.key, e.target.checked)}
                  className="h-4 w-4"
                />
                {f.label}
              </label>
            );
          }
          return (
            <label key={f.key} className={`block ${wrapClass}`}>
              <span className="label">{f.label}</span>
              {f.type === 'textarea' ? (
                <textarea value={value} onChange={(e) => set(f.key, e.target.value)} className="input min-h-24" />
              ) : f.type === 'select' ? (
                <select value={value} onChange={(e) => set(f.key, e.target.value)} className="input">
                  {(f.options || []).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  value={value}
                  onChange={(e) => set(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                  className="input"
                />
              )}
              {f.hint && <span className="mt-1 block text-xs text-navy/50">{f.hint}</span>}
            </label>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
        {msg && <span className="text-sm text-navy/60">{msg}</span>}
      </div>
    </div>
  );
}
