import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useHydration } from '@/hooks/useHydration';

function AppContent(): React.ReactElement {
  const isHydrated = useHydration();

  if (!isHydrated) {
    return (
      <div className="flex h-full items-center justify-center bg-surface">
        <p className="text-sm text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

export function App(): React.ReactElement {
  return (
    // Outer wrapper: fills root, centers the phone frame on desktop
    <div className="flex h-full w-full items-stretch justify-center">
      {/* Inner frame: full-width on mobile, capped at 430 px on desktop */}
      <div className="phone-frame relative flex h-full w-full max-w-[430px] flex-col overflow-hidden" style={{ transform: 'translateZ(0)' }}>
        <AppContent />
      </div>
    </div>
  );
}
