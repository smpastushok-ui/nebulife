// Nebulife Service Worker — enables PWA install + offline caching
// v15: blink only for missile threats; laser hit → camera shake only
const CACHE_NAME = 'nebulife-v15';

// Assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
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
  const weekDate = payload.data?.weekDate ?? '';

  event.waitUntil(
    self.registration.showNotification(title ?? 'Nebulife Weekly', {
      body: body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `digest-${weekDate}`,
      renotify: false,
      data: { action: 'open-digest', weekDate },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const weekDate = event.notification.data?.weekDate ?? '';
  const targetUrl = `/?action=open-digest${weekDate ? `&weekDate=${weekDate}` : ''}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.postMessage({ type: 'open-digest', weekDate });
          return client.focus();
        }
      }
      // Open new tab
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Fetch: network-first for API, cache-first for assets
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

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful GET responses
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
