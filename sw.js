const CACHE_NAME = 'notion-calendar-v1';
const ASSETS = [
  '/notion-calendar/',
  '/notion-calendar/index.html',
  '/notion-calendar/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // API 요청은 캐시하지 않음
  if (e.request.method === 'POST' || e.request.url.includes('workers.dev')) {
    return;
  }
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
