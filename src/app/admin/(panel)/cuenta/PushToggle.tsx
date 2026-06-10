'use client';

import { useEffect, useState } from 'react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function PushToggle() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    const ok =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setSupported(ok);
    if (ok) {
      navigator.serviceWorker.getRegistration().then(async (reg) => {
        const sub = reg && (await reg.pushManager.getSubscription());
        setSubscribed(Boolean(sub));
      });
    }
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      if (!vapid) {
        setMsg('Falta configurar la clave VAPID. Avisá al desarrollador.');
        setBusy(false);
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setMsg('Tenés que permitir las notificaciones para activarlas.');
        setBusy(false);
        return;
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
      });
      if (!res.ok) throw new Error('No se pudo guardar la suscripción.');
      setSubscribed(true);
      setMsg('¡Listo! Vas a recibir notificaciones de nuevos pedidos en este dispositivo.');
    } catch (e) {
      setMsg((e as Error).message || 'No se pudo activar.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg && (await reg.pushManager.getSubscription());
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
      setMsg('Notificaciones desactivadas en este dispositivo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card max-w-md space-y-3 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-navy/60">
        Notificaciones de pedidos
      </h2>
      <p className="text-sm text-navy/65">
        Recibí un aviso en este dispositivo cada vez que entra un pedido nuevo.
      </p>

      {supported === false ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Este dispositivo/navegador no soporta notificaciones. En iPhone:
          abrí el panel desde el ícono que agregaste a la pantalla de inicio
          (no desde Safari) y volvé a intentar.
        </p>
      ) : subscribed ? (
        <button onClick={disable} disabled={busy} className="btn-outline">
          {busy ? '…' : 'Desactivar notificaciones'}
        </button>
      ) : (
        <button onClick={enable} disabled={busy} className="btn-primary">
          {busy ? 'Activando…' : 'Activar notificaciones'}
        </button>
      )}
      {msg && <p className="text-sm font-medium text-navy/70">{msg}</p>}

      <p className="border-t border-navy/10 pt-3 text-xs text-navy/50">
        En iPhone funciona solo con la app agregada a la pantalla de inicio (iOS 16.4+).
        Igual te llega un email a cada pedido como respaldo.
      </p>
    </div>
  );
}
