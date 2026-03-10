import { Outlet, useLocation } from 'react-router-dom';
import { LandscapeNav } from './LandscapeNav';
import { UpdatePrompt } from '@/components/shared/UpdatePrompt';
import { TimerDraftRecovery } from '@/components/TimerDraftRecovery';

/** Routes that render full-screen (no sidebar) */
const FULLSCREEN_ROUTES = ['/timer', '/complete'];

export function LandscapeShell(): React.ReactElement {
  const location = useLocation();
  const isFullscreen = FULLSCREEN_ROUTES.some(r => location.pathname.startsWith(r));

  if (isFullscreen) {
    return (
      <div className="safe-top safe-bottom flex h-full flex-col bg-surface">
        <UpdatePrompt />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
        <TimerDraftRecovery />
      </div>
    );
  }

  return (
    <div className="safe-top safe-bottom flex h-full flex-col bg-surface">
      <UpdatePrompt />
      <div className="flex flex-1 overflow-hidden">
        <LandscapeNav />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <TimerDraftRecovery />
    </div>
  );
}
