import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { getDB } from '@/db';
import type { AppSettings } from '@/types';

const SETTINGS_KEY = 'settings';

const DEFAULT_SETTINGS: AppSettings = {
  lastVisitedTab: '/suggest',
};

interface SettingsState {
  settings: AppSettings;
  isHydrated: boolean;
}

interface SettingsActions {
  hydrate(): Promise<void>;
  setLastVisitedTab(tab: AppSettings['lastVisitedTab']): Promise<void>;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  immer((set, get) => ({
    settings: DEFAULT_SETTINGS,
    isHydrated: false,

    async hydrate() {
      const db = await getDB();
      const stored = await db.get('settings', SETTINGS_KEY);
      set(state => {
        state.settings = stored ?? DEFAULT_SETTINGS;
        state.isHydrated = true;
      });
    },

    async setLastVisitedTab(tab) {
      const db = await getDB();
      const updated: AppSettings = { ...get().settings, lastVisitedTab: tab };
      await db.put('settings', { key: SETTINGS_KEY, ...updated });
      set(state => {
        state.settings.lastVisitedTab = tab;
      });
    },
  })),
);
