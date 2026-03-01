import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export function useTheme(): void {
  const theme = useSettingsStore(s => s.settings.theme) ?? 'system';

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'system') {
      html.removeAttribute('data-theme');
    } else {
      html.setAttribute('data-theme', theme);
    }
  }, [theme]);
}
