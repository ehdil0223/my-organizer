const CACHE = 'personal-organizer-v3';
const ASSETS = ['./', './index.html', './styles.css', './app.js', './config.js', './manifest.webmanifest', './icons/icon-192.svg', './icons/icon-512.svg'];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS))));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => { if (event.request.method !== 'GET') return; const request = event.request; if (new URL(request.url).pathname.endsWith('/config.js')) { event.respondWith(fetch(request).catch(() => caches.match(request))); return; } event.respondWith(caches.match(request).then((cached) => cached || fetch(request))); });
