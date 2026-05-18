const CACHE_NAME = 'notion-calendar-v2';

const APP_SCOPE = self.registration.scope;
const ASSETS = [
  APP_SCOPE,
  new URL('index.html', APP_SCOPE).href,
  new URL('manifest.json', APP_SCOPE).href,
  new URL('icon-192.png', APP_SCOPE).href,
  new URL('icon-512.png', APP_SCOPE).href
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // 한 파일이 404여도 SW 설치 자체가 실패하지 않게 개별 캐시
    await Promise.all(ASSETS.map(async url => {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res && res.ok) await cache.put(url, res.clone());
      } catch (_) {}
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();

    await Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const reqUrl = new URL(event.request.url);

  // Cloudflare Worker, Google Fonts 등 외부 요청은 브라우저에 맡김
  if (reqUrl.origin !== location.origin) return;

  // 앱 진입/새로고침은 네트워크 우선, 실패 시 캐시된 앱으로 fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(APP_SCOPE, copy));
          return res;
        })
        .catch(async () => {
          return (await caches.match(event.request))
              || (await caches.match(APP_SCOPE))
              || (await caches.match(new URL('index.html', APP_SCOPE).href));
        })
    );
    return;
  }

  // 정적 파일은 캐시 우선 + 없으면 네트워크
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return res;
      });
    })
  );
});
