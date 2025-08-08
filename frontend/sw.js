// frontend/sw.js
const CACHE_NAME = 'expense-tracker-v5';
const urlsToCache = [
  'index.html',
  'expense.html',
  'auth.html',
  'styles.css',
  'style.css',
  'script.js',
  'auth.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png'
  // Do not include external URLs like CDN here
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
}); 