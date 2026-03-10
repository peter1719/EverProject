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
// iOS PWA (WKWebView) back gesture  = left-edge touch swiped rightward.
// iOS PWA (WKWebView) forward gesture = right-edge touch swiped leftward.
// preventDefault() must be called on *touchstart* (passive:false) so iOS
// cannot claim the native gesture before touchmove fires.
// Secondary touchmove defence covers the extended swipe zone (20–30px).
{
  let startX = 0;
  let startY = 0;
  let screenW = window.innerWidth;
  window.addEventListener('resize', () => { screenW = window.innerWidth; });

  document.addEventListener('touchstart', (e: TouchEvent) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    // Block left-edge (back) and right-edge (forward) touches immediately.
    if (startX < 20 || startX > screenW - 20) {
      e.preventDefault();
    }
  }, { passive: false });

  // Belt-and-suspenders for the extended swipe zone (20–30px each side).
  document.addEventListener('touchmove', (e: TouchEvent) => {
    const fromLeft  = startX < 30;
    const fromRight = startX > screenW - 30;
    if (!fromLeft && !fromRight) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > 3 && Math.abs(dx) > Math.abs(dy)) {
      // Left edge swiping right = back; right edge swiping left = forward
      if ((fromLeft && dx > 0) || (fromRight && dx < 0)) {
        e.preventDefault();
      }
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
