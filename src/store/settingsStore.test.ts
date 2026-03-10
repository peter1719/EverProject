import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── IDB mock ────────────────────────────────────────────────────────────────
const mockDb = vi.hoisted(() => ({
  get: vi.fn<[string, string], Promise<unknown>>(),
  put: vi.fn<[string, unknown], Promise<void>>(),
}));

vi.mock('@/db', () => ({
  getDB: () => Promise.resolve(mockDb),
}));

// ── Store import (after mocks) ───────────────────────────────────────────────
import { useSettingsStore } from './settingsStore';

const DEFAULT_SETTINGS = { lastVisitedTab: '/library' as const, customOrderIds: [] as string[], theme: 'system' as const, language: 'en' as const, appStyle: 'classic' as const };

beforeEach(() => {
  useSettingsStore.setState({ settings: { ...DEFAULT_SETTINGS }, isHydrated: false });
  mockDb.get.mockResolvedValue(undefined);
  mockDb.put.mockResolvedValue(undefined);
});

// ── hydrate ──────────────────────────────────────────────────────────────────

describe('hydrate', () => {
  it('loads default settings when IDB returns nothing', async () => {
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(useSettingsStore.getState().isHydrated).toBe(true);
  });

  it('loads stored settings from IDB', async () => {
    mockDb.get.mockResolvedValue({
      key: 'settings',
      lastVisitedTab: '/library',
    });
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().settings.lastVisitedTab).toBe('/library');
  });

  it('sets isHydrated to true regardless of DB state', async () => {
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().isHydrated).toBe(true);
  });

  it('is idempotent — second call does not throw', async () => {
    await useSettingsStore.getState().hydrate();
    await expect(useSettingsStore.getState().hydrate()).resolves.toBeUndefined();
    expect(useSettingsStore.getState().isHydrated).toBe(true);
  });
});

// ── setLastVisitedTab ────────────────────────────────────────────────────────

describe('setLastVisitedTab', () => {
  it('updates state to the new tab', async () => {
    await useSettingsStore.getState().setLastVisitedTab('/library');
    expect(useSettingsStore.getState().settings.lastVisitedTab).toBe('/library');
  });

  it('persists via db.put', async () => {
    await useSettingsStore.getState().setLastVisitedTab('/dashboard');
    expect(mockDb.put).toHaveBeenCalledOnce();
  });

  it('accepts all valid tab paths', async () => {
    for (const tab of ['/library', '/suggest', '/dashboard'] as const) {
      await useSettingsStore.getState().setLastVisitedTab(tab);
      expect(useSettingsStore.getState().settings.lastVisitedTab).toBe(tab);
    }
  });
});

// ── setAppStyle ───────────────────────────────────────────────────────────────

describe('setAppStyle', () => {
  it('updates appStyle in state', async () => {
    await useSettingsStore.getState().setAppStyle('pixel');
    expect(useSettingsStore.getState().settings.appStyle).toBe('pixel');
  });

  it('persists via db.put', async () => {
    await useSettingsStore.getState().setAppStyle('zen');
    expect(mockDb.put).toHaveBeenCalledOnce();
  });

  it('accepts all valid style values', async () => {
    for (const style of ['classic', 'pixel', 'paper', 'zen'] as const) {
      await useSettingsStore.getState().setAppStyle(style);
      expect(useSettingsStore.getState().settings.appStyle).toBe(style);
    }
  });
});

// ── hydrate: appStyle fallback ────────────────────────────────────────────────

describe('hydrate appStyle fallback', () => {
  it('falls back to classic appStyle when IDB has no appStyle', async () => {
    mockDb.get.mockResolvedValue({
      key: 'settings',
      lastVisitedTab: '/library',
      theme: 'dark',
    });
    await useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().settings.appStyle).toBe('classic');
  });
});
