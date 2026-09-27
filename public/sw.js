/* Public lab only. Never persist API, identity, workspace, RSC, or third-party responses. */
const CACHE = 'interleave-public-v1';
const BUILD_ASSETS = [];
const SHELL = [
  '/lab',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  ...BUILD_ASSETS,
];
const publicAsset = (url) =>
  url.origin === self.location.origin &&
  !url.search &&
  (url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.svg');
async function offlineResponse() {
  const cached = await caches.match('/offline.html');
  // Static hosts may canonicalize .html URLs. A navigation fallback must not
  // retain that redirect flag or the browser can reject the response.
  return cached
    ? new Response(cached.body, {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    : Response.error();
}
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith('interleave-public-') && key !== CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    request.headers.has('RSC') ||
    request.headers.has('X-RSC-Navigation')
  )
    return;
  const labNavigation =
    request.mode === 'navigate' && url.pathname === '/lab' && !url.search;
  if (labNavigation) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (
            response.ok &&
            response.headers.get('Content-Type')?.includes('text/html') &&
            !response.redirected
          ) {
            try {
              const cache = await caches.open(CACHE);
              await cache.put('/lab', response.clone());
            } catch {
              /* Storage exhaustion must not break the online lab. */
            }
          }
          return response;
        } catch {
          return (await caches.match('/lab')) || (await offlineResponse());
        }
      })(),
    );
    return;
  }
  // Other navigation can show a neutral fallback but never caches private HTML.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(offlineResponse));
    return;
  }
  if (!publicAsset(url)) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic' && !response.redirected) {
        try {
          await cache.put(request, response.clone());
        } catch {
          /* Keep the network response usable if storage is full. */
        }
      }
      return response;
    })(),
  );
});
