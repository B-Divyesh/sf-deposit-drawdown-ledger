const VERSION = 'retainer-ledger-v1.1.0';
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;
const SHELL_URLS = ['/', '/index.html', '/offline.html', '/manifest.v3.webmanifest', '/icon.v3.svg', '/icons/icon-192.v3.png', '/icons/icon-512.v3.png', '/icons/icon-maskable-512.v3.png', '/assets/hero-night-ledger-480.v3.avif', '/assets/hero-night-ledger-480.v3.webp', '/assets/hero-night-ledger-960.v3.avif', '/assets/hero-night-ledger-960.v3.webp', '/assets/hero-night-ledger-960.v3.jpg'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await cache.addAll(SHELL_URLS);
    const index = await fetch('/index.html');
    const markup = await index.clone().text();
    await cache.put('/index.html', index);
    const builtAssets = [...markup.matchAll(/(?:src|href)="(\/assets\/[^"?]+)"/g)].map((match) => match[1]);
    await Promise.all(builtAssets.map(async (asset) => {
      const response = await fetch(asset, { cache: 'reload' });
      if (response.ok) await cache.put(asset, response);
    }));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => ![SHELL, RUNTIME].includes(key)).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // License verification is the only cross-origin request this app makes.
  // Do not bypass the worker for this app's own sociobot.in production host.
  if (url.origin === 'https://api.sociobot.in') return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(RUNTIME).then((cache) => cache.put(request, copy));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/index.html')) || caches.match('/offline.html')));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) caches.open(RUNTIME).then((cache) => cache.put(request, response.clone()));
      return response;
    })));
  }
});
