// Basic service worker for offline caching
const CACHE = 'clt-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  // logos
  './assets/logos/toyota.svg',
  './assets/logos/honda.svg',
  './assets/logos/ford.svg',
  './assets/logos/bmw.svg',
  './assets/logos/mercedes.svg',
  './assets/logos/audi.svg',
  './assets/logos/tesla.svg',
  './assets/logos/chevrolet.svg',
  './assets/logos/nissan.svg',
  './assets/logos/hyundai.svg',
  './assets/logos/kia.svg',
  './assets/logos/volkswagen.svg',
  './assets/logos/subaru.svg',
  './assets/logos/lexus.svg',
  './assets/logos/jeep.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  event.respondWith(
    caches.match(req).then(cacheRes => cacheRes || fetch(req))
  );
});
