// Service worker minimo: sin libreria (next-pwa/Serwist quedan para mas
// adelante si hace falta cache mas sofisticado). Cubre lo que exige la
// instalabilidad de una PWA: registrar un fetch handler y cachear el
// puñado de assets estaticos que no cambian entre despliegues.
const CACHE_NAME = "portal-watts-v1";
const PRECACHE_URLS = [
  "/manifest.json",
  "/icon-watts.png",
  "/watts_logo_blanco.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

// Cache-first para los assets estaticos precacheados; todo lo demas
// (paginas, /api/*) va directo a red sin interceptar, para no servir
// datos de sesion o de negocio desactualizados.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (!PRECACHE_URLS.includes(url.pathname)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request))
  );
});
