import { useSettingsStore } from '@/store/settingsStore';
import type { AppStyle } from '@/types';

export function useAppStyle(): AppStyle {
  return useSettingsStore(s => s.settings.appStyle) ?? 'classic';
}
