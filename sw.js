const CACHE_NAME = 'flightpulse-v7';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  'https://cdn.tailwindcss.com'
  // ⚠️ Removed style.css unless you actually have that file in your root!
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('✅ App Shell Pre-cached');
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', event => {
  // 👑 CRITICAL: Takes control of the app immediately so it works on the first visit
  event.waitUntil(clients.claim());
  console.log('🚀 Service Worker Activated');
});

self.addEventListener('fetch', event => {
  // 1. Bypass cache for live API calls (must go to network)
  if (event.request.url.includes('/api/')) {
    return; 
  }
  
  // 2. Strategy: Cache First, then Network
  // This is best for a "Cold Boot" because it loads the UI instantly from local storage
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => {
        // 3. Offline Fallback: If network fails and it's a page request, show index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
