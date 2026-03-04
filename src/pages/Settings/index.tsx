import { useRef, useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { PixelDialog } from '@/components/shared/PixelDialog';
import { useSettingsStore } from '@/store/settingsStore';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { exportData, importData } from '@/lib/backup';
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

// ── Data / Backup section ─────────────────────────────────────────────────────

function DataSection(): React.ReactElement {
  const { t } = useTranslation();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<{
    file: File;
    projects: number;
    sessions: number;
    images: number;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport(includeImages: boolean): Promise<void> {
    setExportDialogOpen(false);
    setIsExporting(true);
    try {
      await exportData(includeImages);
    } finally {
      setIsExporting(false);
    }
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
      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">
        {t('settings.data')}
      </p>
      <div className="bg-surface-variant rounded-xl p-4 flex flex-col gap-3">
        {/* Export button */}
        <button
          onClick={() => setExportDialogOpen(true)}
          disabled={isExporting}
          className="w-full bg-primary-container text-on-primary-container rounded-xl h-12 px-6 text-sm font-medium active:opacity-80 transition-opacity duration-100 disabled:opacity-50"
        >
          {isExporting ? t('settings.data.exporting') : t('settings.data.export')}
        </button>

        {/* Divider */}
        <div className="border-t border-outline/20" />

        {/* Import button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={e => void handleFileChange(e)}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full border border-outline text-primary bg-transparent rounded-xl h-12 px-6 text-sm font-medium active:opacity-80 transition-opacity duration-100"
        >
          {t('settings.data.import')}
        </button>

        {/* Status message */}
        {statusMessage && (
          <p
            className={cn(
              'text-sm text-center',
              statusMessage.isError ? 'text-error' : 'text-success',
            )}
          >
            {statusMessage.text}
          </p>
        )}
      </div>

      {/* Export format dialog */}
      {exportDialogOpen && (
        <>
          <div
            className="fixed inset-0 bg-black opacity-60 pointer-events-auto"
            style={{ zIndex: 200 }}
            onClick={() => setExportDialogOpen(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed left-4 right-4 top-1/2 -translate-y-1/2 bg-surface rounded-xl p-6 shadow-xl border border-outline/20 flex flex-col gap-3"
            style={{ zIndex: 201 }}
          >
            <p className="text-base text-on-surface leading-relaxed">
              {t('settings.data.exportChoose')}
            </p>
            <button
              onClick={() => void handleExport(true)}
              className="w-full bg-primary text-on-primary rounded-xl h-12 px-6 text-sm font-medium active:opacity-80 transition-opacity duration-100"
            >
              {t('settings.data.exportFull')}
            </button>
            <button
              onClick={() => void handleExport(false)}
              className="w-full bg-primary-container text-on-primary-container rounded-xl h-12 px-6 text-sm font-medium active:opacity-80 transition-opacity duration-100"
            >
              {t('settings.data.exportDataOnly')}
            </button>
            <button
              onClick={() => setExportDialogOpen(false)}
              className="w-full border border-outline text-on-surface-variant bg-transparent rounded-xl h-12 px-6 text-sm font-medium active:opacity-80 transition-opacity duration-100"
            >
              {t('btn.cancel')}
            </button>
          </div>
        </>
      )}

      {/* Import confirmation dialog */}
      <PixelDialog
        isOpen={pendingImport !== null}
        message={t('settings.data.importConfirm', {
          p: pendingImport?.projects ?? 0,
          s: pendingImport?.sessions ?? 0,
          i: pendingImport?.images ?? 0,
        })}
        confirmLabel={t('btn.ok')}
        cancelLabel={t('btn.cancel')}
        onConfirm={() => void handleConfirmImport()}
        onCancel={() => setPendingImport(null)}
      />
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

        {/* Data section */}
        <DataSection />
      </div>
    </div>
  );
}
