const CACHE_NAME = "repdeck-v2";

const urlsToCache = [
  "/",
  "/index.html"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // special handling for exercise videos
  if (req.url.includes("/assets/exercises/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;

        const response = await fetch(req);
        cache.put(req, response.clone());
        return response;
      })
    );
    return;
  }

  // default behavior
  event.respondWith(
    caches.match(req).then((response) => {
      return response || fetch(req);
    })
  );
});
