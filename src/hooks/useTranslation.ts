import { useSettingsStore } from '@/store/settingsStore';
import { translations } from '@/i18n/translations';

export function useTranslation(): { t: (key: string, vars?: Record<string, string | number>) => string } {
  const language = useSettingsStore(s => s.settings.language) ?? 'en';
  const dict = translations[language] ?? translations.en;

  function t(key: string, vars?: Record<string, string | number>): string {
    const raw = dict[key] ?? translations.en[key] ?? key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
  }

  return { t };
}
