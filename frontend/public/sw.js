const CACHE_NAME = 'pulso-pwa-v20';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon-32x32.png',
  '/favicon.ico',
  '/pulso-loading-mark.png',
  '/manifest.webmanifest',
  '/fonts/inter-latin-variable.woff2',
  '/fonts/inter-latin-ext-variable.woff2',
  '/pulso-app-icon-192.png',
  '/pulso-app-maskable-192.png',
  '/pulso-app-icon-512.png',
  '/pulso-app-maskable-512.png',
  '/city-engineering-logo.png',
  '/pulso-apple-touch-icon.png',
  '/pulso-bg-dark.svg',
  '/pulso-bg-light.svg',
  '/flags/ph.svg',
  '/flags/us.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Pass API requests directly
  if (event.request.url.includes('/api/') || event.request.url.includes(':33159')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => networkResponse)
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Network offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
