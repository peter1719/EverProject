import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useHydration } from '@/hooks/useHydration';
import { useTheme } from '@/hooks/useTheme';

function AppContent(): React.ReactElement {
  const isHydrated = useHydration();
  useTheme();

  if (!isHydrated) {
    return (
      <div className="flex h-full items-center justify-center bg-surface">
        <p className="text-sm text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

function useLandscape(): boolean {
  const [isLandscape, setIsLandscape] = useState(
    () => window.matchMedia('(orientation: landscape)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const handler = (e: MediaQueryListEvent) => setIsLandscape(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isLandscape;
}

export function App(): React.ReactElement {
  const isLandscape = useLandscape();

  return (
    // Outer wrapper: fills root, centers the phone frame on desktop
    <div className="flex h-full w-full items-stretch justify-center">
      {/* Landscape blocker — shown on mobile when rotated sideways */}
      {isLandscape && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 bg-surface sm:hidden">
          <span className="text-4xl" aria-hidden>↻</span>
          <p className="text-base font-medium text-on-surface">請旋轉裝置至直向</p>
          <p className="text-sm text-on-surface-variant">Portrait mode only</p>
        </div>
      )}

      {/* Inner frame: full-width on mobile, capped at 430 px on desktop */}
      <div id="phone-frame" className="phone-frame relative flex h-full w-full max-w-[430px] flex-col overflow-hidden" style={{ transform: 'translateZ(0)' }}>
        <AppContent />
      </div>
    </div>
  );
}
