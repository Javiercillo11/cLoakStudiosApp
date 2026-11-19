// Service worker de cLoak Studios App: permite instalar la app y abrirla rápido.
// Los datos (Supabase) nunca se cachean: siempre van a la red.
const CACHE = 'cloak-v2'
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

// ───────────── Avisos push (Edge Function notify-new-lead) ─────────────
// Carga útil: { title, body, tag, path } — path es relativo a la app, p. ej. "#/solicitudes/<id>".

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'cLoak Studios', {
      body: data.body || '',
      icon: SCOPE + 'icon-192.png',
      tag: data.tag, // una notificación por solicitud, aunque llegue repetida
      data: { url: new URL(data.path || '', SCOPE).href },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || SCOPE
  event.waitUntil(
    (async () => {
      // Si la app ya está abierta, se reutiliza esa ventana; si no, se abre una nueva
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find((w) => w.url.startsWith(SCOPE))
      if (open) {
        await open.focus()
        if ('navigate' in open) {
          try {
            await open.navigate(url)
            return
          } catch {
            /* navegador sin navigate(): se abre una ventana */
          }
        } else return
      }
      await self.clients.openWindow(url)
    })(),
  )
})
