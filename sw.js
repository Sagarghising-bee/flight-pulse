const CACHE_NAME = 'flightpulse-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  // CRITICAL FIX: Always bypass the Service Worker for backend API calls
  if (event.request.url.includes('/api/')) {
    return; // Let the browser handle the network request naturally
  }
  
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => caches.match('/index.html'));
    })
  );
});
