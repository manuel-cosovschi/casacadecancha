// Service Worker para notificaciones push del admin de Casaca de Cancha.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Casaca de Cancha', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Casaca de Cancha';
  const options = {
    body: data.body || 'Tenés novedades en tu tienda.',
    icon: '/apple-icon',
    badge: '/apple-icon',
    data: { url: data.url || '/admin/pedidos' },
    tag: data.tag || 'cdc-order',
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/admin/pedidos';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes('/admin') && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
