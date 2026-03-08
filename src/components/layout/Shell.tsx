import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { UpdatePrompt } from '@/components/shared/UpdatePrompt';
import { PWAInstallBanner } from '@/components/shared/PWAInstallBanner';
import { TimerDraftRecovery } from '@/components/TimerDraftRecovery';

/** Routes that should NOT show the BottomNav */
const FULLSCREEN_ROUTES = ['/timer', '/complete', '/settings'];

export function Shell(): React.ReactElement {
  const location = useLocation();
  const isFullscreen = FULLSCREEN_ROUTES.some(r => location.pathname.startsWith(r));

  return (
    <div className="safe-top flex h-full flex-col">
      {/* SW update banner — sits above everything */}
      <UpdatePrompt />

      <main
        className="flex-1 overflow-hidden"
      >
        <Outlet />
      </main>

      {!isFullscreen && (
        <>
          <PWAInstallBanner />
          <BottomNav />
        </>
      )}

      <TimerDraftRecovery />
    </div>
  );
}
