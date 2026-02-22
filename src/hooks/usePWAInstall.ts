import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstall {
  /** True when the browser install prompt is available (Android/Desktop Chrome) */
  canInstall: boolean;
  /** Call to trigger the native install prompt */
  promptInstall: () => Promise<void>;
  /** True once the app has been installed */
  isInstalled: boolean;
}

/**
 * Captures the `beforeinstallprompt` event so we can show a custom install button.
 * Works on Android Chrome and desktop Chromium browsers.
 * iOS Safari does not fire this event — use the `isIOS` flag + manual instructions.
 */
export function usePWAInstall(): PWAInstall {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // Initialise synchronously — safe because it reads from a stable media query
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches,
  );

  useEffect(() => {
    if (isInstalled) return;

    function onBeforeInstall(e: Event): void {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }

    function onAppInstalled(): void {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [isInstalled]);

  async function promptInstall(): Promise<void> {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }

  return {
    canInstall: !!deferredPrompt,
    promptInstall,
    isInstalled,
  };
}
