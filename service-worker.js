/* GPX-sovellus – Service Worker v1.7 */

const CACHE_NAME = 'gpx-v1.7';

const PRECACHE_URLS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // HTML-navigointi: hae ensisijaisesti verkosta.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();

            event.waitUntil(
              caches.open(CACHE_NAME)
                .then(cache => cache.put('./index.html', clone))
            );
          }

          return response;
        })
        .catch(async () => {
          return (
            await caches.match('./index.html') ||
            await caches.match(event.request)
          );
        })
    );

    return;
  }

  // Muut saman palvelimen resurssit: Cache First.
  event.respondWith(
    caches.match(event.request).then(async cached => {
      if (cached) return cached;

      const response = await fetch(event.request);

      if (response && response.ok) {
        const clone = response.clone();

        event.waitUntil(
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone))
        );
      }

      return response;
    })
  );
});
