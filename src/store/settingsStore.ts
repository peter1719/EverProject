/**
 * Zustand store for app settings with Immer middleware.
 * Manages: theme (system/light/dark), language (en/zh-TW), appStyle (classic/pixel/paper/zen),
 *          lastVisitedTab, customOrderIds (Library custom sort order).
 * Defaults: lastVisitedTab='/library', theme='system', language='en', appStyle='classic'
 * Dependencies: src/db/index.ts (getDB), src/types (AppSettings, AppTheme, AppLanguage, AppStyle)
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { getDB } from '@/db';
import type { AppSettings, AppTheme, AppLanguage, AppStyle } from '@/types';

const SETTINGS_KEY = 'settings';

const DEFAULT_SETTINGS: AppSettings = {
  lastVisitedTab: '/library',
  customOrderIds: [],
  theme: 'system',
  language: 'en',
  appStyle: 'classic',
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
  setTheme(theme: AppTheme): Promise<void>;
  setLanguage(lang: AppLanguage): Promise<void>;
  setAppStyle(style: AppStyle): Promise<void>;
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  immer((set, get) => ({
    settings: DEFAULT_SETTINGS,
    customOrderIds: [],
    isHydrated: false,

    async hydrate() {
      const db = await getDB();
      const stored = await db.get('settings', SETTINGS_KEY);
      const merged: AppSettings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
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

    async setTheme(theme) {
      const db = await getDB();
      const updated: AppSettings = { ...get().settings, theme };
      await db.put('settings', { key: SETTINGS_KEY, ...updated });
      set(state => {
        state.settings.theme = theme;
      });
    },

    async setLanguage(lang) {
      const db = await getDB();
      const updated: AppSettings = { ...get().settings, language: lang };
      await db.put('settings', { key: SETTINGS_KEY, ...updated });
      set(state => {
        state.settings.language = lang;
      });
    },

    async setAppStyle(style) {
      const db = await getDB();
      const updated: AppSettings = { ...get().settings, appStyle: style };
      await db.put('settings', { key: SETTINGS_KEY, ...updated });
      set(state => {
        state.settings.appStyle = style;
      });
    },
  })),
);
