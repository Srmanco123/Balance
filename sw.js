// Caché mínima del esqueleto.
// Red primero y SIN pasar por la caché HTTP del navegador: GitHub Pages sirve
// los archivos con diez minutos de caché, y eso hacía que tras cada despliegue
// siguiera ejecutándose la versión anterior.
const CACHE = "balance-v2";
const BASE = ["./", "./index.html", "./css/estilo.css", "./manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((claves) =>
      Promise.all(claves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  const mismoOrigen = new URL(e.request.url).origin === self.location.origin;
  const peticion = mismoOrigen
    ? new Request(e.request.url, { cache: "reload", credentials: "same-origin" })
    : e.request;

  e.respondWith(
    fetch(peticion)
      .then((r) => {
        const copia = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copia));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
