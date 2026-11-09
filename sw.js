/* Service worker for KATCHUP. The shell is a file tree (css/, js/, icons/), so every local asset is
   precached; the cache prefix keeps this app's storage separate from anything else the origin hosts. */
const CACHE_NAME = 'katchup-v4';
/* prune scope: this app's older caches only. A shared origin keeps its siblings. */
const CACHE_PREFIX = 'katchup-';

const APP_SHELL = [
  /* canonical root: Cloudflare Pages 308s /index.html here, and a cached redirect cannot answer a navigation */
  './',
  './manifest.json',
  './favicon.ico',
  './css/tokens.css',
  './css/components.css',
  './css/pranks.css',
  './css/views.css',
  './css/motion.css',
  './css/pranks-peeker.css',
  './css/analytics.css',
  './js/config.js',
  './js/utils.js',
  './js/audio.js',
  './js/data.js',
  './js/nav.js',
  './js/ui.js',
  './js/analytics.js',
  './js/music.js',
  './js/home.js',
  './js/ideas.js',
  './js/saved.js',
  './js/share.js',
  './js/viewstate.js',
  './js/pranks.js',
  './js/app.js',
  './icons/android-chrome-192x192.png',
  './icons/android-chrome-512x512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32x32.png',
  './icons/favicon-16x16.png'
];

// Cross-origin and therefore opaque: the Tailwind JIT runtime is what styles every screen, and the two
// stylesheets carry the @font-face rules. Without them the cached HTML renders unstyled offline. Kept as the
// exact <head> URLs (query strings included) because caches.match() keys on the whole URL.
const EXTERNAL = [
  'https://cdn.tailwindcss.com?plugins=forms,container-queries',
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@400;600;700;800&family=Permanent+Marker&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&icon_names=chat,content_copy,done_all,how_to_vote,newspaper,palette,restaurant,school,sentiment_very_satisfied,spa,star&display=block'
];

// Install: pre-cache the app shell so the UI loads instantly / offline.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // one add() per asset: a single refusal (blocked CDN, offline install) must not abort the whole install
      .then((cache) => Promise.all(APP_SHELL.concat(EXTERNAL).map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up this tree's old cache versions only — a shared origin may host other apps' caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.indexOf(CACHE_PREFIX) === 0 && key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - API calls (ngrok/webhook) -> network-first, never cached, so trend data is always live.
// - Everything else (app shell, fonts, icons) -> serve from cache, refresh in the background, so a
//   deploy lands on the next load instead of needing a hard refresh. Note the background put() only accepts
//   status 200 and skips opaque responses, so the EXTERNAL assets above are covered at install, not here.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  const isApiCall = url.hostname.includes('ngrok-free.dev') || url.pathname.includes('/api/v1/');

  if (isApiCall) {
    event.respondWith(
      fetch(req).catch(() => new Response(
        JSON.stringify({ error: 'offline', message: 'Tidak ada koneksi internet.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Media (the Instagram-CDN previews) and anything else outside the shell go straight to the browser:
  // a service worker that answers a Range request with a full 200 body breaks playback in iOS Safari.
  if (req.method !== 'GET' || req.headers.has('range')) return;
  if (url.origin !== self.location.origin && EXTERNAL.indexOf(url.href) === -1) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        /* never cache a redirected response: a navigation cannot be answered with one */
        if (res && res.status === 200 && res.type !== 'opaque' && !res.redirected) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      event.waitUntil(network.catch(() => {}));   // keep the background refresh alive after respondWith settles
      return cached || network;
    })
      // a navigation to any other URL (directory, ?query) still needs the shell to boot offline
      .then((res) => res || (req.mode === 'navigate' ? caches.match('./') : res))
  );
});
