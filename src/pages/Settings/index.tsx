import { PageHeader } from '@/components/layout/PageHeader';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import type { AppTheme, AppLanguage } from '@/types';

// ── Theme options ─────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: AppTheme; labelKey: string }[] = [
  { value: 'system', labelKey: 'settings.theme.system' },
  { value: 'light', labelKey: 'settings.theme.light' },
  { value: 'dark', labelKey: 'settings.theme.dark' },
];

function ThemeToggle(): React.ReactElement {
  const { t } = useTranslation();
  const theme = useSettingsStore(s => s.settings.theme) ?? 'system';
  const setTheme = useSettingsStore(s => s.setTheme);

  return (
    <div className="flex rounded-xl overflow-hidden border border-outline/30">
      {THEME_OPTIONS.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => void setTheme(opt.value)}
          className={cn(
            'flex-1 py-3 text-sm font-medium transition-none',
            i < THEME_OPTIONS.length - 1 ? 'border-r border-outline/30' : '',
            theme === opt.value
              ? 'bg-primary-container text-on-primary-container'
              : 'text-on-surface-variant',
          )}
        >
          {t(opt.labelKey)}
        </button>
      ))}
    </div>
  );
}

// ── Language options ──────────────────────────────────────────────────────────

const LANG_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh-TW', label: '繁體中文' },
];

function LanguageToggle(): React.ReactElement {
  const language = useSettingsStore(s => s.settings.language) ?? 'en';
  const setLanguage = useSettingsStore(s => s.setLanguage);

  return (
    <div className="flex rounded-xl overflow-hidden border border-outline/30">
      {LANG_OPTIONS.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => void setLanguage(opt.value)}
          className={cn(
            'flex-1 py-3 text-sm font-medium transition-none',
            i < LANG_OPTIONS.length - 1 ? 'border-r border-outline/30' : '',
            language === opt.value
              ? 'bg-primary-container text-on-primary-container'
              : 'text-on-surface-variant',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Main Settings page ────────────────────────────────────────────────────────

export function Settings(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t('page.settings')} showBack backPath="/dashboard" />

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6">
        {/* Appearance section */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">
            {t('settings.appearance')}
          </p>
          <div className="bg-surface-variant rounded-xl p-4 flex flex-col gap-3">
            <p className="text-sm font-medium text-on-surface">{t('settings.theme')}</p>
            <ThemeToggle />
          </div>
        </div>

        {/* Language section */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">
            {t('settings.language')}
          </p>
          <div className="bg-surface-variant rounded-xl p-4">
            <LanguageToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
