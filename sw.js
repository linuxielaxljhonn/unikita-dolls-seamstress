/* Service worker de Unikita Dolls Seamstress.
   PARA PUBLICAR UNA VERSIÓN NUEVA: cambia VERSION (y APP_VERSION en index.html) y vuelve a subir la carpeta. */
const VERSION='1.5.0';
const CACHE = 'unikita-' + VERSION;
const SHELL = ['./', 'index.html', 'data.js', 'engine.js', 'illustrate.js', 'gate.js', 'logo.png', 'manifest.webmanifest',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('unikita-') && k !== CACHE && k !== 'unikita-runtime').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // catálogo común: siempre intenta la red primero (para recibir diseños nuevos)
  if (url.origin === location.origin && (url.pathname.endsWith('disenos.json') || url.pathname.endsWith('acceso.json'))) {
    e.respondWith(fetch(req, { cache: 'no-store' }).then(r => { const c = r.clone(); caches.open('unikita-runtime').then(x => x.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || new Response(url.pathname.endsWith('acceso.json') ? 'null' : '[]', { headers: { 'Content-Type': 'application/json' } }))));
    return;
  }
  // fuentes de Google: caché y actualización en segundo plano
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open('unikita-runtime').then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
    return;
  }
  // app: primero la caché de esta versión
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(req, c)); }
      return r;
    }).catch(() => req.mode === 'navigate' ? caches.match('index.html') : undefined)));
  }
});
