// OSLC Cloud Master Portal - Smart PWA Service Worker
// Provides: Instant App Load, Instant Auto-Update, and Offline Resilience

const CACHE_NAME = 'oslc-portal-v3.1';
const STATIC_ASSETS = [
  '/',
  '/portal_static/style.css',
  '/portal_static/app.js',
  '/portal_static/manifest.json',
  '/portal_static/icon-192.png',
  '/portal_static/icon-512.png'
];

// Install: Cache core assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate: Clean up old cache versions immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First for live data and pages, falling back to cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests or external APIs
  if (event.request.method !== 'GET') return;

  // For API endpoints or live dynamic data: always fetch network
  if (url.pathname.startsWith('/api/') || url.pathname.includes('sync_status.json')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Network-first with cache fallback for HTML pages so user gets new updates immediately
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
