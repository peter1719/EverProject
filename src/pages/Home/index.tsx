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
