import { useRef, useState } from 'react';
import { PixelDialog } from '@/components/shared/PixelDialog';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { exportData, importData } from '@/lib/backup';
import { STYLE_OPTIONS } from '@/lib/constants';
import type { AppTheme, AppLanguage, AppStyle } from '@/types';

function StylePicker(): React.ReactElement {
  const { t } = useTranslation();
  const appStyle = useSettingsStore(s => s.settings.appStyle) ?? 'classic';
  const setAppStyle = useSettingsStore(s => s.setAppStyle);
  const current = STYLE_OPTIONS.find(o => o.value === appStyle) ?? STYLE_OPTIONS[0];

  return (
    <div className="relative">
      <div
        className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full pointer-events-none"
        style={{ backgroundColor: current.swatchPrimary }}
      />
      <select
        value={appStyle}
        onChange={e => void setAppStyle(e.target.value as AppStyle)}
        className="w-full h-11 pl-8 pr-4 rounded-xl border border-outline/30 bg-surface text-on-surface text-sm appearance-none cursor-pointer focus:outline-none focus:border-primary"
      >
        {STYLE_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-xs">▾</span>
    </div>
  );
}

const THEME_OPTIONS: { value: AppTheme; labelKey: string }[] = [
  { value: 'system', labelKey: 'settings.theme.system' },
  { value: 'light', labelKey: 'settings.theme.light' },
  { value: 'dark', labelKey: 'settings.theme.dark' },
];

const LANG_OPTIONS: { value: AppLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'zh-TW', label: '繁體中文' },
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
            theme === opt.value ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant',
          )}
        >
          {t(opt.labelKey)}
        </button>
      ))}
    </div>
  );
}

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
            language === opt.value ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function DataSection(): React.ReactElement {
  const { t } = useTranslation();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ file: File; projects: number; sessions: number; images: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport(includeImages: boolean): Promise<void> {
    setExportDialogOpen(false);
    setIsExporting(true);
    try { await exportData(includeImages); } finally { setIsExporting(false); }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!e.target.files) return;
    e.target.value = '';
    if (!file) return;
    try {
      const result = await importData(file);
      setPendingImport({ file, ...result });
    } catch {
      setStatusMessage({ text: t('settings.data.importError'), isError: true });
    }
  }

  async function handleConfirmImport(): Promise<void> {
    if (!pendingImport) return;
    try {
      await importData(pendingImport.file);
      setPendingImport(null);
      setStatusMessage({ text: t('settings.data.importSuccess'), isError: false });
    } catch {
      setPendingImport(null);
      setStatusMessage({ text: t('settings.data.importError'), isError: true });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('settings.data')}</p>
      <div className="bg-surface-variant rounded-xl p-4 flex flex-col gap-3">
        <div className="flex gap-3">
          <button
            onClick={() => setExportDialogOpen(true)}
            disabled={isExporting}
            className="flex-1 bg-primary-container text-on-primary-container rounded-xl h-12 px-4 text-sm font-medium active:opacity-80 transition-opacity duration-100 disabled:opacity-50"
          >
            {isExporting ? t('settings.data.exporting') : t('settings.data.export')}
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={e => void handleFileChange(e)} />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 border border-outline text-primary bg-transparent rounded-xl h-12 px-4 text-sm font-medium active:opacity-80 transition-opacity duration-100"
          >
            {t('settings.data.import')}
          </button>
        </div>
        {statusMessage && (
          <p className={cn('text-sm text-center', statusMessage.isError ? 'text-error' : 'text-success')}>
            {statusMessage.text}
          </p>
        )}
      </div>

      {exportDialogOpen && (
        <>
          <div className="fixed inset-0 bg-black opacity-60" style={{ zIndex: 200 }} onClick={() => setExportDialogOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface rounded-xl p-6 shadow-xl border border-outline/20 flex flex-col gap-3 w-80"
            style={{ zIndex: 201 }}
          >
            <p className="text-base text-on-surface leading-relaxed">{t('settings.data.exportChoose')}</p>
            <button onClick={() => void handleExport(true)} className="w-full bg-primary text-on-primary rounded-xl h-12 px-6 text-sm font-medium active:opacity-80 transition-opacity duration-100">{t('settings.data.exportFull')}</button>
            <button onClick={() => void handleExport(false)} className="w-full bg-primary-container text-on-primary-container rounded-xl h-12 px-6 text-sm font-medium active:opacity-80 transition-opacity duration-100">{t('settings.data.exportDataOnly')}</button>
            <button onClick={() => setExportDialogOpen(false)} className="w-full border border-outline text-on-surface-variant bg-transparent rounded-xl h-12 px-6 text-sm font-medium active:opacity-80 transition-opacity duration-100">{t('btn.cancel')}</button>
          </div>
        </>
      )}

      <PixelDialog
        isOpen={pendingImport !== null}
        message={t('settings.data.importConfirm', { p: pendingImport?.projects ?? 0, s: pendingImport?.sessions ?? 0, i: pendingImport?.images ?? 0 })}
        confirmLabel={t('btn.ok')}
        cancelLabel={t('btn.cancel')}
        onConfirm={() => void handleConfirmImport()}
        onCancel={() => setPendingImport(null)}
        className="max-w-sm mx-auto"
      />
    </div>
  );
}

export function LandscapeSettings(): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
      <div className="flex items-center border-b border-outline/20 px-5 py-4">
        <h1 className="text-lg font-semibold text-on-surface">{t('page.settings')}</h1>
      </div>

      {/* Centred content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-xl px-6 py-6 flex flex-col gap-6">
          {/* Appearance */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('settings.appearance')}</p>
            <div className="bg-surface-variant rounded-xl p-4 flex flex-col gap-3">
              <p className="text-sm font-medium text-on-surface">{t('settings.style')}</p>
              <StylePicker />
              <div className="border-t border-outline/20" />
              <p className="text-sm font-medium text-on-surface">{t('settings.theme')}</p>
              <ThemeToggle />
            </div>
          </div>

          {/* Language */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('settings.language')}</p>
            <div className="bg-surface-variant rounded-xl p-4">
              <LanguageToggle />
            </div>
          </div>

          {/* Data */}
          <DataSection />

          <p className="text-xs text-on-surface-variant/50 text-center pb-2">
            <span className="font-bold text-primary">E</span> · EverProject v{__APP_VERSION__}
          </p>
        </div>
      </div>
    </div>
  );
}
