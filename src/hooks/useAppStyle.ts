/**
 * Convenience hook for reading the current app style.
 * Returns: AppStyle ('classic' | 'pixel' | 'paper' | 'zen'), defaulting to 'classic'.
 * Used by components that need to conditionally alter rendering based on the active style.
 * Dependencies: settingsStore, src/types (AppStyle)
 */
import { useSettingsStore } from '@/store/settingsStore';
import type { AppStyle } from '@/types';

export function useAppStyle(): AppStyle {
  return useSettingsStore(s => s.settings.appStyle) ?? 'classic';
}
