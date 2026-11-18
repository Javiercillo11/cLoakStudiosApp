// Service worker de cLoak Studios App: permite instalar la app y abrirla rápido.
// Los datos (Supabase) nunca se cachean: siempre van a la red.
const CACHE = 'cloak-v1'
const SCOPE = self.registration.scope // .../cLoakStudiosApp/

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([SCOPE, SCOPE + 'logo-mark.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== self.location.origin) return

  // Páginas: red primero (siempre la última versión), caché si no hay conexión
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(SCOPE, copy))
          return res
        })
        .catch(() => caches.match(SCOPE)),
    )
    return
  }

  // Ficheros estáticos (JS/CSS con hash, iconos): caché primero
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copy))
      }
      return res
    })),
  )
})
