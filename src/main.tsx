import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// ── Block iOS edge-swipe back/forward navigation ───────────────────────────
// iOS Safari and standalone PWA treat a swipe starting from the left screen
// edge as a "go back" gesture. Calling preventDefault() on touchstart when
// the touch originates within 20 px of the left edge suppresses it.
// We track touchmove direction first so we don't block simple edge taps.
{
  let startX = 0;
  let startY = 0;
  let edgeTouchBlocked = false;

  document.addEventListener('touchstart', (e: TouchEvent) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    edgeTouchBlocked = false;
  }, { passive: true });

  document.addEventListener('touchmove', (e: TouchEvent) => {
    if (edgeTouchBlocked) { e.preventDefault(); return; }
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    // Only suppress a rightward horizontal swipe starting from the left edge
    if (startX < 20 && dx > 5 && Math.abs(dx) > Math.abs(dy)) {
      edgeTouchBlocked = true;
      e.preventDefault();
    }
  }, { passive: false });
}

// ── Service Worker registration ────────────────────────────────────────────
// We use manual registration (not vite-plugin-pwa's auto-register) so we can
// control the update flow and avoid interrupting an active timer session.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL })
      .then(registration => {
        // Proactively check for updates on launch (important for iOS PWA which
        // doesn't poll in the background like Android Chrome does).
        void registration.update();

        // Re-check whenever the user returns to the app (e.g. switching back
        // from another app on iPhone).
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            void registration.update();
          }
        });

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New SW waiting — dispatch event so the app can show an update prompt
              window.dispatchEvent(new CustomEvent('sw-update-available'));
            }
          });
        });
      })
      .catch(err => {
        console.warn('[SW] Registration failed:', err);
      });

    // When a new SW takes control, reload to get fresh assets
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  });
}
