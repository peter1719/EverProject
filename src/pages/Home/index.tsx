/**
 * Home page (/) — no visible UI, only a redirect.
 * Reads settings.lastVisitedTab and immediately navigates there.
 * First-time users default to /library.
 * Dependencies: settingsStore, react-router-dom
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/store/settingsStore';

export function Home(): React.ReactElement {
  const navigate = useNavigate();
  const lastVisitedTab = useSettingsStore(s => s.settings.lastVisitedTab);
  const isHydrated = useSettingsStore(s => s.isHydrated);

  useEffect(() => {
    if (isHydrated) {
      navigate(lastVisitedTab, { replace: true });
    }
  }, [isHydrated, lastVisitedTab, navigate]);

  return <></>;
}
