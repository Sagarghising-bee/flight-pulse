//  BUMPED TO V8: Forces the phone to clear old ghost data!
const CACHE_NAME = 'flightpulse-v8'; 
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css', // ✅ Your CSS is safely back in the cache!
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ App Shell Pre-cached (v8)');
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', event => {
  // Takes control immediately & deletes old v7 caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => clients.claim())
  );
  console.log('🚀 Service Worker Activated (v8)');
});

self.addEventListener('fetch', event => {
  // 1. Bypass cache for live API calls (must go to network)
  if (event.request.url.includes('/api/')) {
    return; 
  }
  
  // 2. Cache-First Strategy for Offline Resilience
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
