import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/library', labelKey: 'nav.library', icon: '▤' },
  { path: '/suggest', labelKey: 'nav.suggest', icon: '?' },
  { path: '/dashboard', labelKey: 'nav.stats', icon: '▦' },
];

export function LandscapeNav(): React.ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <nav
      className="flex h-full shrink-0 flex-col border-r border-outline/30 bg-surface-variant py-4"
      style={{
        width: 'calc(4rem + env(safe-area-inset-left))',
        paddingLeft: 'env(safe-area-inset-left)',
      }}
    >
      {/* App icon */}
      <div className="flex justify-center mb-6">
        <span className="text-lg font-bold text-primary" aria-label="EverProject">E</span>
      </div>

      {/* Main nav items */}
      <div className="flex flex-1 flex-col items-center gap-1 px-2">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={t(item.labelKey)}
              aria-label={t(item.labelKey)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex w-full items-center justify-center rounded-xl py-3 text-base transition-colors duration-150',
                isActive
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface',
              )}
            >
              {item.icon}
            </button>
          );
        })}
      </div>

      {/* Settings at bottom */}
      <div className="flex flex-col items-center px-2">
        <button
          onClick={() => navigate('/settings')}
          title={t('page.settings')}
          aria-label={t('page.settings')}
          className={cn(
            'flex w-full items-center justify-center rounded-xl py-3 text-base transition-colors duration-150',
            location.pathname === '/settings'
              ? 'bg-primary-container text-on-primary-container'
              : 'text-on-surface-variant hover:bg-surface',
          )}
        >
          ⚙
        </button>
      </div>
    </nav>
  );
}
