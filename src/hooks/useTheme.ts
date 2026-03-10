import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export function useTheme(): void {
  const theme = useSettingsStore(s => s.settings.theme) ?? 'system';
  const appStyle = useSettingsStore(s => s.settings.appStyle) ?? 'classic';

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'system') {
      html.removeAttribute('data-theme');
    } else {
      html.setAttribute('data-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    const html = document.documentElement;
    if (appStyle === 'classic') {
      html.removeAttribute('data-style');
    } else {
      html.setAttribute('data-style', appStyle);
    }
  }, [appStyle]);
}
