import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useHydration } from '@/hooks/useHydration';
import { useTheme } from '@/hooks/useTheme';
import { useIsLandscapeUI } from '@/hooks/useIsLandscapeUI';
import { LandscapeApp } from '@/landscape/LandscapeApp';

export function App(): React.ReactElement {
  const isHydrated = useHydration();
  useTheme();
  const isLandscape = useIsLandscapeUI();

  // When switching landscape → portrait, sync portrait router to the current hash path.
  // landscape router navigates via history.pushState which updates window.location.hash
  // but does NOT fire popstate, so the portrait router misses those updates.
  useEffect(() => {
    if (!isLandscape) {
      const hash = window.location.hash;
      const path = hash.startsWith('#') ? hash.slice(1) : '/library';
      if (path && path !== '/') {
        void router.navigate(path, { replace: true });
      }
    }
  }, [isLandscape]);

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
