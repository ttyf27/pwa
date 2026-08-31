const CACHE = 'kenshin-v1';
const ASSETS = ['./', 'index.html', 'sync.js', 'manifest.json'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(
    ks.filter(k => k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // API (GitHub) はネット直、キャッシュしない
  if (u.hostname === 'api.github.com') return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (e.request.method === 'GET' && resp.ok && u.origin === location.origin) {
        const cp = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp)).catch(() => {});
      }
      return resp;
    }).catch(() => r))
  );
});
