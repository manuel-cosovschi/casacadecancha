'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveSizeGuide } from '../_crud-actions';

interface Row {
  size: string;
  width: number;
  length: number;
}

export function SizeGuideEditor({ guide }: { guide?: any }) {
  const router = useRouter();
  const [name, setName] = useState(guide?.name ?? '');
  const [audience, setAudience] = useState(guide?.audience ?? 'adultos');
  const [rows, setRows] = useState<Row[]>(guide?.measurements_json ?? []);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function update(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await saveSizeGuide(guide?.id ?? null, name, audience, rows);
    setBusy(false);
    setMsg(res.error || 'Guardado ✓');
    if (!res.error) router.refresh();
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-xs">
          <span className="label">Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input !py-1.5" />
        </label>
        <label className="text-xs">
          <span className="label">Audiencia</span>
          <select value={audience} onChange={(e) => setAudience(e.target.value)} className="input !py-1.5">
            <option value="adultos">Adultos</option>
            <option value="ninos">Niños</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full min-w-[22rem] text-sm">
        <thead>
          <tr className="text-left text-navy/50">
            <th className="py-1">Talle</th>
            <th className="py-1">Ancho (cm)</th>
            <th className="py-1">Largo (cm)</th>
            <th className="py-1"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-navy/5">
              <td className="py-1 pr-2"><input value={r.size} onChange={(e) => update(i, { size: e.target.value })} className="input !py-1 w-20" /></td>
              <td className="py-1 pr-2"><input type="number" value={r.width} onChange={(e) => update(i, { width: Number(e.target.value) })} className="input !py-1 w-24" /></td>
              <td className="py-1 pr-2"><input type="number" value={r.length} onChange={(e) => update(i, { length: Number(e.target.value) })} className="input !py-1 w-24" /></td>
              <td className="py-1"><button onClick={() => setRows((p) => p.filter((_, idx) => idx !== i))} className="text-xs text-red-600">×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <button onClick={() => setRows((p) => [...p, { size: '', width: 0, length: 0 }])} className="mt-3 text-sm font-semibold text-navy hover:underline">
        + Agregar fila
      </button>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="btn-primary">{busy ? 'Guardando…' : 'Guardar tabla'}</button>
        {msg && <span className="text-sm text-navy/60">{msg}</span>}
      </div>
    </div>
  );
}
