/**
 * OSLC Karigar Gate Pass System - Service Worker
 * Enables PWA install prompt & fast caching for mobile devices
 */
const CACHE_NAME = 'oslc-gatepass-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/static/css/style.css',
  '/static/css/print.css',
  '/static/js/app.js',
  '/static/img/oslc_logo.svg',
  '/static/img/oslc_logo_print.svg',
  '/static/img/favicon.svg',
  '/static/img/oslc_icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.log('SW cache err', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network first with fallback to cache for static files; don't cache API calls
  if (event.request.url.includes('/api/')) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
