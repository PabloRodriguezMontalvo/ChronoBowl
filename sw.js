const CACHE = "bb-crono-v2";

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

async function safeCacheAdd(cache, url) {
  try {
    await cache.add(url);
  } catch (error) {
    console.warn("[sw] skipped asset:", url, error);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);

      await Promise.allSettled(
        PRECACHE.map((url) => safeCacheAdd(cache, url)),
      );

      await precacheShellAssets(cache);
      await self.skipWaiting();
    })(),
  );
});

async function precacheShellAssets(cache) {
  try {
    const response = await cache.match("./index.html");
    if (!response) return;

    const html = await response.text();
    const urls = new Set(
      [...html.matchAll(/(?:src|href)="((?:\.\/|\/)?assets\/[^"]+)"/g)].map((match) => match[1]),
    );

    for (const url of [...urls].filter((entry) => entry.endsWith(".js"))) {
      try {
        const scriptResponse = await fetch(url);
        if (!scriptResponse.ok || scriptResponse.status === 206) continue;

        const script = await scriptResponse.text();
        for (const match of script.matchAll(/assets\/[\w.-]+\.(?:js|css|woff2?|png|svg)/g)) {
          const asset = match[0];
          urls.add(asset.startsWith("./") || asset.startsWith("/") ? asset : `./${asset}`);
        }
      } catch (error) {
        console.warn("[sw] failed to inspect script:", url, error);
      }
    }

    await Promise.allSettled(
      [...urls].map((url) => safeCacheAdd(cache, url)),
    );
  } catch (error) {
    console.warn("[sw] precacheShellAssets failed:", error);
  }
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  try {
    if (new URL(request.url).origin !== self.location.origin) return;
  } catch {
    return;
  }

  // Range requests are partial responses; Cache API does not support them.
  if (request.headers.has("range")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok && response.status !== 206) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(() => caches.match("./index.html", { ignoreSearch: true })),
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreVary: true }).then(
      (cached) =>
        cached ||
        fetch(request).then((response) => {
          if (response.ok && response.status !== 206) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
