// Service Worker – Lesespiel
// Version hochzählen wenn eine neue Version deployed wird → erzwingt neuen Cache
const CACHE_VERSION = 'lesespiel-v1';

const FILES_TO_CACHE = [
  './',
  './index.html',
  './Lesespiel.bin',
  './Lesespiel.data',
];

// ── Install: alle Dateien in den Cache laden ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(FILES_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: alten Cache löschen ────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keyList =>
      Promise.all(
        keyList
          .filter(key => key !== CACHE_VERSION)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-first, dann Netzwerk ────────────────────────────────
self.addEventListener('fetch', event => {
  // Nur GET-Requests cachen
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Aus dem Cache liefern
        return cachedResponse;
      }
      // Nicht im Cache → Netzwerk holen und gleichzeitig cachen
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_VERSION).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline und nicht im Cache → leere Antwort
        console.warn('[SW] Fetch failed for:', event.request.url);
      });
    })
  );
});
