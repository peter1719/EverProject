import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { exportData } from '@/lib/backup';

/**
 * Listens for a new SW and shows an MD3-style "Update available" banner.
 * User must tap to apply — prevents mid-session disruption.
 * When tapping Update, a dialog asks if they want to back up first.
 */
export function UpdatePrompt(): React.ReactElement {
  const [showPrompt, setShowPrompt] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [isBacking, setIsBacking] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    function onUpdate(): void {
      setShowPrompt(true);
      requestAnimationFrame(() => setVisible(true));
    }
    window.addEventListener('sw-update-available', onUpdate);
    return () => window.removeEventListener('sw-update-available', onUpdate);
  }, []);

  function applyUpdate(): void {
    void navigator.serviceWorker.getRegistration().then(reg => {
      reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    });
    setShowPrompt(false);
    setShowBackupDialog(false);
  }

  function handleUpdateClick(): void {
    setShowBackupDialog(true);
  }

  function handleLater(): void {
    setVisible(false);
    setTimeout(() => setShowPrompt(false), 250);
  }

  async function handleBackupAndUpdate(): Promise<void> {
    setIsBacking(true);
    try {
      await exportData(false);
    } finally {
      setIsBacking(false);
      applyUpdate();
    }
  }

  if (!showPrompt) return <></>;

  return (
    <>
      {/* Update banner */}
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
            onClick={handleUpdateClick}
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

      {/* Backup confirmation dialog — portalled to body to escape phone-frame stacking context */}
      {showBackupDialog && createPortal(
        <>
          <div
            className="fixed inset-0 bg-black/60 pointer-events-auto"
            style={{ zIndex: 200 }}
            onClick={() => setShowBackupDialog(false)}
            aria-hidden
          />
          <div
            role="alertdialog"
            aria-modal="true"
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 bg-surface rounded-xl p-6 shadow-xl border border-outline/20"
            style={{ zIndex: 201 }}
          >
            <p className="text-base font-semibold text-on-surface mb-2">
              {t('pwa.backupPromptTitle')}
            </p>
            <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
              {t('pwa.backupPromptDesc')}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { void handleBackupAndUpdate(); }}
                disabled={isBacking}
                className="h-12 rounded-xl bg-primary text-on-primary font-medium active:opacity-80 transition-opacity duration-100 disabled:opacity-50"
              >
                {isBacking ? '…' : t('pwa.backupAndUpdate')}
              </button>
              <button
                onClick={applyUpdate}
                className="h-12 rounded-xl border border-outline text-on-surface-variant bg-transparent font-medium active:opacity-80 transition-opacity duration-100"
              >
                {t('pwa.updateAnyway')}
              </button>
              <button
                onClick={() => setShowBackupDialog(false)}
                className="h-10 text-sm text-on-surface-variant active:opacity-60 transition-opacity duration-100"
              >
                {t('pwa.cancel')}
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </>
  );
}
