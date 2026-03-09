import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useHydration } from '@/hooks/useHydration';
import { useTheme } from '@/hooks/useTheme';
import { useIsLandscapeUI } from '@/hooks/useIsLandscapeUI';
import { useTimerStore } from '@/store/timerStore';
import { LandscapeApp } from '@/landscape/LandscapeApp';

export function App(): React.ReactElement {
  const isHydrated = useHydration();
  useTheme();
  const isLandscape = useIsLandscapeUI();
  const timerPhase = useTimerStore(s => s.phase);

  // When switching landscape → portrait while timer is running,
  // imperatively navigate the portrait router to /timer so it's not lost.
  useEffect(() => {
    if (!isLandscape && timerPhase !== 'idle') {
      void router.navigate('/timer');
    }
  }, [isLandscape, timerPhase]);

  if (!isHydrated) {
    return (
      <div className="flex h-full items-center justify-center bg-surface">
        <p className="text-sm text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (isLandscape) {
    return <LandscapeApp />;
  }

  return (
    <div className="flex h-full w-full items-stretch justify-center">
      <div id="phone-frame" className="phone-frame relative flex h-full w-full max-w-[430px] flex-col overflow-hidden" style={{ transform: 'translateZ(0)' }}>
        <RouterProvider router={router} />
      </div>
    </div>
  );
}
