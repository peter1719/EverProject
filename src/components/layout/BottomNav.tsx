import { useLocation, useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';

interface NavTab {
  path: '/library' | '/suggest' | '/dashboard';
  label: string;
  icon: string;
}

const TABS: NavTab[] = [
  { path: '/library', label: 'Library', icon: '▤' },
  { path: '/suggest', label: 'Suggest', icon: '▶' },
  { path: '/dashboard', label: 'Stats', icon: '▦' },
];

export function BottomNav(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const setLastVisitedTab = useSettingsStore(s => s.setLastVisitedTab);

  function handleTabPress(path: NavTab['path']): void {
    void setLastVisitedTab(path);
    navigate(path);
  }

  return (
    <nav className="safe-bottom flex border-t border-outline/30 bg-surface px-2 pt-1">
      {TABS.map(tab => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => handleTabPress(tab.path)}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium transition-colors duration-150',
              isActive
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant',
            )}
            style={{ minHeight: 56 }}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="text-base leading-none" aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
