import { usePWAInstall } from '@/hooks/usePWAInstall';

/**
 * Shows an MD3-style install banner when the browser supports native install.
 * Hidden once installed or dismissed.
 */
export function PWAInstallBanner(): React.ReactElement {
  const { canInstall, promptInstall, isInstalled } = usePWAInstall();

  if (!canInstall || isInstalled) return <></>;

  return (
    <div className="bg-surface-variant border-t border-outline/30 flex items-center gap-3 px-4 py-2">
      <p className="flex-1 text-sm text-on-surface">
        Add to home screen
      </p>
      <button
        onClick={() => void promptInstall()}
        className="shrink-0 rounded-xl bg-primary text-on-primary text-xs px-3 py-2 active:opacity-80 transition-opacity duration-100"
      >
        Install
      </button>
    </div>
  );
}
