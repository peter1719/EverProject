/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// ── Precache all build assets ──────────────────────────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── Google Fonts: cache-first (fonts don't change) ────────────────────────
registerRoute(
  ({ url }) =>
    url.origin === 'https://fonts.googleapis.com' ||
    url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        maxEntries: 10,
      }),
    ],
  }),
);

// ── Navigation requests: serve from precache, fall back to network ─────────
// This ensures the SPA shell always loads offline.
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'navigation',
    plugins: [
      new ExpirationPlugin({ maxEntries: 5 }),
    ],
  }),
);

// ── Skip waiting only when all clients acknowledge ────────────────────────
// We use manual control to avoid interrupting an active timer session.
self.addEventListener('message', event => {
  if ((event.data as { type?: string })?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

// ── Claim clients on activation ───────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
