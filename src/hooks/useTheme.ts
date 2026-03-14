/**
 * Theme and app style application hook (side-effect only, no return value).
 * Syncs settingsStore theme/appStyle to html[data-theme] and html[data-style] attributes.
 * 'system' theme removes data-theme, letting CSS prefers-color-scheme take over.
 * 'classic' style removes data-style, applying default styles.
 * Dependencies: settingsStore
 */
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
