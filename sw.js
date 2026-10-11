self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const DEFAULTS = {
  en: { title: 'Web Push Demo', body: 'Hello from a push event!' },
  id: { title: 'Demo Web Push', body: 'Halo dari event push!' },
};

// Real server push lands here; the page's button uses the same display path.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {
    data = { body: event.data && event.data.text() };
  }
  // Optional `lang` ("en" | "id") in the push payload picks the default text; title/body override it.
  const def = DEFAULTS[data.lang] || DEFAULTS.en;
  event.waitUntil(self.registration.showNotification(data.title || def.title, {
    body: data.body || def.body,
    lang: data.lang || 'en',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    data: { url: data.url || './' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || './', self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if ('focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
