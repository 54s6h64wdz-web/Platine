// Service worker : Platine s'ouvre instantanément, même hors connexion.
// L'app est servie depuis la copie enregistrée sur l'appareil ; à chaque ouverture,
// index.html compare son build avec version.json (GitHub) et se met à jour si besoin.
// À chaque mise à jour : même numéro que BUILD dans index.html et que version.json.
const CACHE = 'platine-build-35';
const ASSETS = ['./', './index.html', './manifest.webmanifest',
  './scratch-worklet.js', './regle.html', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
// Copie locale d'abord (rapide, marche hors connexion), réseau si absente.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('version.json')) return;          // toujours en direct
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request, { cache: 'no-cache' }).then(r => {
      if (r.status === 200) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return r;
    }).catch(() => caches.match('./index.html')))
  );
});
