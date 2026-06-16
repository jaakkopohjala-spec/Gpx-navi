/* GPX-sovellus – Service Worker v1.6
   Strategia: Cache First, päivittyy taustalla.
   Kaikki sovelluksen tiedostot välimuistitetaan ensimmäisellä latauksella,
   jonka jälkeen sovellus toimii täysin offline-tilassa. */

const CACHE_NAME = 'gpx-v1.6';

const PRECACHE_URLS = [
  './Gpx_v1_6.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* ── Asennus: esitäytä välimuisti ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      /* Ikonit ovat valinnaisia – jos niitä ei ole, ei kaatuile */
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(() => {
            console.warn('[SW] Ei voitu välimuistittaa:', url);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

/* ── Aktivointi: poista vanhat välimuistit ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: Cache First → Network fallback ── */
self.addEventListener('fetch', event => {
  /* Käsitellään vain GET-pyynnöt samasta originista */
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        /* Palautetaan välimuistista; päivitetään taustalla */
        const networkFetch = fetch(event.request)
          .then(response => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache =>
                cache.put(event.request, clone)
              );
            }
            return response;
          })
          .catch(() => { /* verkko ei tavoitettavissa – ei haittaa */ });

        /* Ei odoteta taustapäivitystä */
        void networkFetch;
        return cached;
      }

      /* Ei välimuistissa – haetaan verkosta ja välimuistitetaan */
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache =>
          cache.put(event.request, clone)
        );
        return response;
      });
    })
  );
});
