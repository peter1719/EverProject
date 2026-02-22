import { useState, useEffect } from 'react';

/**
 * Listens for a new SW and shows an MD3-style "Update available" banner.
 * User must tap to apply — prevents mid-session disruption.
 */
export function UpdatePrompt(): React.ReactElement {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    function onUpdate(): void {
      setShowPrompt(true);
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

  if (!showPrompt) return <></>;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-primary-container text-on-primary-container border-b border-outline/30 flex items-center justify-between px-4 py-2 gap-3"
      style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
    >
      <p className="text-sm font-medium">
        Update available
      </p>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleUpdate}
          className="rounded-lg bg-primary text-on-primary text-xs px-3 py-1.5 active:opacity-80 transition-opacity duration-100"
        >
          Reload
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="rounded-lg border border-outline text-on-surface-variant text-xs px-3 py-1.5 active:opacity-80 transition-opacity duration-100"
        >
          Later
        </button>
      </div>
    </div>
  );
}
