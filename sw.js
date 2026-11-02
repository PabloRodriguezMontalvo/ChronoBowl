// Service worker for offline launch.
// Bump CACHE (bb-roster-vN) whenever the caching logic in this file changes,
// so old caches are deleted on activate.
const CACHE = 'bb-roster-v1'
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).then(() => precacheShellAssets(cache)))
      .then(() => self.skipWaiting()),
  )
})

// The first page load happens before the worker controls it, so cache the hashed
// Vite assets referenced by index.html to make the first online visit enough.
async function precacheShellAssets(cache) {
  const response = await cache.match('/index.html')
  if (!response) return
  const html = await response.text()
  const urls = new Set([...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((match) => match[1]))
  // Lazy chunks are referenced by name inside the entry scripts; include them too.
  for (const url of [...urls].filter((entry) => entry.endsWith('.js'))) {
    const script = await (await fetch(url)).text()
    for (const match of script.matchAll(/assets\/[\w.-]+\.(?:js|css|woff2?|png|svg)/g)) urls.add(`/${match[0]}`)
  }
  await cache.addAll([...urls])
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Network-first so new deployments are picked up on the next online launch.
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put('/index.html', copy))
          }
          return response
        })
        .catch(() => caches.match('/index.html', { ignoreSearch: true })),
    )
    return
  }

  // Cache-first for static assets (Vite assets are content-hashed).
  event.respondWith(
    caches.match(request, { ignoreVary: true }).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        }),
    ),
  )
})
