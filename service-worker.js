/*
  SAIYAN · service worker
  Guarda la app en el teléfono para abrirla sin conexión.
  Cuando cambies cualquier archivo y vuelvas a subirlo a GitHub, sube también el número de VERSION
  para que los teléfonos descarguen la versión nueva.
*/
const VERSION = 'saiyan-pwa-v1';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'assets/goku-0.webp', 'assets/goku-1.webp', 'assets/goku-2.webp', 'assets/goku-3.webp', 'assets/goku-4.webp',
  'assets/goku-5.webp', 'assets/goku-6.webp', 'assets/goku-7.webp', 'assets/goku-8.webp', 'assets/goku-9.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isFont = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Pantalla principal: primero la red (para recibir actualizaciones) y, sin conexión, la copia guardada.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put('index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('index.html').then((hit) => hit || caches.match('./'))),
    );
    return;
  }

  // Tipografías de Google: se guardan al verlas una vez y se actualizan en segundo plano.
  if (isFont(url)) {
    event.respondWith(
      caches.open(VERSION).then((cache) =>
        cache.match(req).then((hit) => {
          const net = fetch(req)
            .then((res) => {
              if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
              return res;
            })
            .catch(() => hit);
          return hit || net;
        }),
      ),
    );
    return;
  }

  // Archivos propios (imágenes, íconos, manifiesto): primero la copia guardada.
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
