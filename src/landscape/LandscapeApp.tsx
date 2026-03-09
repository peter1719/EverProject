import { Navigate, RouterProvider, createHashRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { LandscapeShell } from './LandscapeShell';
import { LandscapeLibrary } from './pages/LandscapeLibrary';
import { LandscapeSuggest } from './pages/LandscapeSuggest';
import { LandscapeCombo } from './pages/LandscapeCombo';
import { LandscapeDashboard } from './pages/LandscapeDashboard';
import { LandscapeTimer } from './pages/LandscapeTimer';
import { LandscapeComplete } from './pages/LandscapeComplete';
import { LandscapeSettings } from './pages/LandscapeSettings';

const landscapeRouter = createHashRouter([
  {
    path: '/',
    element: <LandscapeShell />,
    children: [
      { index: true, element: <Navigate to="/library" replace /> },
      { path: 'library', element: <LandscapeLibrary /> },
      { path: 'suggest', element: <LandscapeSuggest /> },
      { path: 'combo', element: <LandscapeCombo /> },
      { path: 'dashboard', element: <LandscapeDashboard /> },
      { path: 'timer', element: <LandscapeTimer /> },
      { path: 'complete', element: <LandscapeComplete /> },
      { path: 'settings', element: <LandscapeSettings /> },
    ],
  },
]);

export function LandscapeApp(): React.ReactElement {
  // Sync landscape router to current hash on mount.
  // portrait router navigates via history.pushState which updates window.location.hash
  // but does NOT fire popstate, so the landscape router (unmounted) misses those updates.
  useEffect(() => {
    const hash = window.location.hash;
    const path = hash.startsWith('#') ? hash.slice(1) : '/library';
    if (path && path !== '/') {
      void landscapeRouter.navigate(path, { replace: true });
    }
  }, []);

  return <RouterProvider router={landscapeRouter} />;
}
