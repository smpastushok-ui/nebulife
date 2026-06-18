// Nebulife Service Worker — enables PWA install + offline caching
// v29: keep the worker for push notifications, but do not cache the app shell
// or JS assets. Fresh deploys must always win over an old PWA/service-worker UI.
const CACHE_NAME = 'nebulife-v29';

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate: clean all old Nebulife app-shell caches. The SW is retained only
// for notifications and last-ditch offline fallback, never for normal UI cache.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('nebulife-')).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ---------------------------------------------------------------------------
// Push notifications — FCM background push (fires when app is closed)
// ---------------------------------------------------------------------------

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'Nebulife', body: event.data.text() } };
  }

  const { title, body } = payload.notification ?? {};
  const data = payload.data ?? {};
  const weekDate = data.weekDate ?? '';
  const action = data.action ?? 'open-notification';
  const link = data.link ?? (weekDate ? `/?action=open-digest&weekDate=${weekDate}` : `/?action=${action}`);
  const tag = data.notificationId ?? data.type ?? `digest-${weekDate}`;

  event.waitUntil(
    self.registration.showNotification(title ?? 'Nebulife Weekly', {
      body: body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag,
      renotify: false,
      data: { ...data, action, weekDate, link },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data ?? {};
  const weekDate = data.weekDate ?? '';
  const action = data.action ?? 'open-notification';
  const targetUrl = data.link ?? `/?action=${action}${weekDate ? `&weekDate=${weekDate}` : ''}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.postMessage({ type: action, weekDate, data });
          return client.focus();
        }
      }
      // Open new tab
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Fetch: network-only for the app shell/assets. Do not write new UI responses
// into Cache Storage; stale cached HTML/JS has repeatedly hidden new screens.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle http/https — skip chrome-extension:// and other schemes
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Never cache API calls
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
