import { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Listens for a new SW and shows an MD3-style "Update available" banner.
 * User must tap to apply — prevents mid-session disruption.
 */
export function UpdatePrompt(): React.ReactElement {
  const [showPrompt, setShowPrompt] = useState(false);
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    function onUpdate(): void {
      setShowPrompt(true);
      // Trigger slide-in on next frame
      requestAnimationFrame(() => setVisible(true));
    }
    window.addEventListener('sw-update-available', onUpdate);
    return () => window.removeEventListener('sw-update-available', onUpdate);
  }, []);

  function handleUpdate(): void {
    void navigator.serviceWorker.getRegistration().then(reg => {
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    });
    setShowPrompt(false);
  }

  function handleLater(): void {
    setVisible(false);
    setTimeout(() => setShowPrompt(false), 250);
  }

  if (!showPrompt) return <></>;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-primary-container text-on-primary-container border-b border-outline/30 flex items-center gap-3 px-4 py-2 transition-transform duration-[250ms] ease-out"
      style={{
        paddingTop: 'max(8px, env(safe-area-inset-top))',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
      }}
    >
      {/* Arrows-rotate icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-4 h-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
      </svg>

      <p className="text-sm font-medium text-on-surface-variant flex-1">
        {t('pwa.updateAvailable')}
      </p>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleUpdate}
          className="rounded-xl bg-primary text-on-primary text-xs font-medium px-3 py-1.5 active:opacity-80 transition-opacity duration-100"
        >
          {t('pwa.update')}
        </button>
        <button
          onClick={handleLater}
          className="rounded-xl border border-outline text-on-surface-variant bg-transparent text-xs font-medium px-3 py-1.5 active:opacity-80 transition-opacity duration-100"
        >
          {t('pwa.later')}
        </button>
      </div>
    </div>
  );
}
