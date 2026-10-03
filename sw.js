const CACHE_NAME = "finrecord-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./dashboard.html",
  "./transactions.html",
  "./accounts.html",
  "./budgets.html",
  "./goals.html",
  "./calendar.html",
  "./reports.html",
  "./debts.html",
  "./subscriptions.html",
  "./settings.html",
  "./css/dashboard.css",
  "./js/theme.js",
  "./js/storage.js",
  "./js/utils.js",
  "./js/pwa.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
