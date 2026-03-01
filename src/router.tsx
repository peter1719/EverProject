import { createHashRouter } from 'react-router-dom';
import { Shell } from '@/components/layout/Shell';
import { Home } from '@/pages/Home';
import { ProjectLibrary } from '@/pages/ProjectLibrary';
import { DailySuggestion } from '@/pages/DailySuggestion';
import { ComboSuggestion } from '@/pages/ComboSuggestion';
import { PomodoroTimer } from '@/pages/PomodoroTimer';
import { SessionComplete } from '@/pages/SessionComplete';
import { ActivityDashboard } from '@/pages/ActivityDashboard';
import { Settings } from '@/pages/Settings';

export const router = createHashRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'library', element: <ProjectLibrary /> },
      { path: 'suggest', element: <DailySuggestion /> },
      { path: 'combo', element: <ComboSuggestion /> },
      { path: 'timer', element: <PomodoroTimer /> },
      { path: 'complete', element: <SessionComplete /> },
      { path: 'dashboard', element: <ActivityDashboard /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);
