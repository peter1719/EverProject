import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { getDB } from '@/db';
import type { AppSettings } from '@/types';

const SETTINGS_KEY = 'settings';

const DEFAULT_SETTINGS: AppSettings = {
  lastVisitedTab: '/suggest',
  customOrderIds: [],
};

interface SettingsState {
  settings: AppSettings;
  customOrderIds: string[];
  isHydrated: boolean;
}

interface SettingsActions {
  hydrate(): Promise<void>;
  setLastVisitedTab(tab: AppSettings['lastVisitedTab']): Promise<void>;
  setCustomOrder(ids: string[]): Promise<void>;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  immer((set, get) => ({
    settings: DEFAULT_SETTINGS,
    customOrderIds: [],
    isHydrated: false,

    async hydrate() {
      const db = await getDB();
      const stored = await db.get('settings', SETTINGS_KEY);
      const merged = stored ?? DEFAULT_SETTINGS;
      set(state => {
        state.settings = merged;
        state.customOrderIds = merged.customOrderIds ?? [];
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

    async setCustomOrder(ids) {
      const db = await getDB();
      const updated: AppSettings = { ...get().settings, customOrderIds: ids };
      await db.put('settings', { key: SETTINGS_KEY, ...updated });
      set(state => {
        state.settings.customOrderIds = ids;
        state.customOrderIds = ids;
      });
    },
  })),
);
