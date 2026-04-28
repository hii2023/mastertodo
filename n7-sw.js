/* N7 Board — Service Worker
   Network-first strategy: always fetches fresh content when online,
   falls back to cache when offline. App refreshes every time it opens.
*/

const CACHE = 'n7board-v1';

/* On install: activate immediately, no waiting */
self.addEventListener('install', e => {
  self.skipWaiting();
});

/* On activate: claim clients and clean old caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch: network-first for navigation (the HTML page itself),
   cache-first for static assets (fonts, firebase scripts, etc.) */
self.addEventListener('fetch', e => {
  const { request } = e;

  /* Navigation requests — always try network first so app stays fresh */
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(response => {
          /* Cache the fresh page for offline fallback */
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request)) /* offline: serve cached page */
    );
    return;
  }

  /* Everything else (scripts, fonts, etc.) — cache first, then network */
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});

/* Allow page to trigger an immediate SW update */
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
