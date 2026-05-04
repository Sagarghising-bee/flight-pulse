const CACHE_NAME = 'flightpulse-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/style.css',
  'https://cdn.tailwindcss.com',
  'https://api.allorigins.win/raw?url=' // CORS proxy cache hint
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  // Don't cache API calls (let them go online)
  if (event.request.url.includes('aviationstack') || event.request.url.includes('allorigins')) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).catch(() => caches.match('/index.html'));
    })
  );
});