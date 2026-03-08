import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Shell } from './Shell';

// Stub child stores that Shell's children import
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: (selector: (s: unknown) => unknown) =>
    selector({
      settings: { lastVisitedTab: '/suggest' },
      isHydrated: true,
      setLastVisitedTab: vi.fn().mockResolvedValue(undefined),
    }),
}));

// Stub usePWAInstall so PWAInstallBanner renders nothing (canInstall = false)
vi.mock('@/hooks/usePWAInstall', () => ({
  usePWAInstall: () => ({
    canInstall: false,
    isInstalled: false,
    promptInstall: vi.fn(),
  }),
}));

vi.mock('@/db', () => ({
  getDB: () => Promise.resolve({ put: vi.fn() }),
}));

vi.mock('@/db/timerDraft', () => ({
  loadTimerDraft: vi.fn().mockResolvedValue(undefined),
  clearTimerDraft: vi.fn().mockResolvedValue(undefined),
  saveTimerDraft: vi.fn().mockResolvedValue(undefined),
}));

function Child() {
  return <div data-testid="child-content">PAGE CONTENT</div>;
}

function renderShell(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="*" element={<Child />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

// ── BottomNav visibility ──────────────────────────────────────────────────────

describe('Shell BottomNav visibility', () => {
  it('renders BottomNav on a normal route (/library)', () => {
    renderShell('/library');
    // BottomNav renders Library, Suggest, Stats tabs
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Suggest')).toBeInTheDocument();
    expect(screen.getByText('Stats')).toBeInTheDocument();
  });

  it('hides BottomNav on /timer route', () => {
    renderShell('/timer');
    expect(screen.queryByText('Suggest')).not.toBeInTheDocument();
  });

  it('hides BottomNav on /timer/anything sub-path', () => {
    renderShell('/timer/123');
    expect(screen.queryByText('Suggest')).not.toBeInTheDocument();
  });

  it('hides BottomNav on /complete route', () => {
    renderShell('/complete');
    expect(screen.queryByText('Suggest')).not.toBeInTheDocument();
  });
});

// ── main element ──────────────────────────────────────────────────────────────

describe('Shell main element', () => {
  it('main has no inline paddingBottom — BottomNav is a flex sibling, not fixed', () => {
    renderShell('/library');
    const main = screen.getByRole('main');
    // paddingBottom is not set as an inline style; layout is handled by flex column
    expect(main.style.paddingBottom).toBe('');
  });

  it('main is present on /timer (fullscreen) route', () => {
    renderShell('/timer');
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('main is present on /complete (fullscreen) route', () => {
    renderShell('/complete');
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('main has overflow-hidden class to contain page scroll', () => {
    renderShell('/library');
    expect(screen.getByRole('main')).toHaveClass('overflow-hidden');
  });

  it('main does NOT have overflow-y-auto class (regression guard)', () => {
    renderShell('/library');
    expect(screen.getByRole('main')).not.toHaveClass('overflow-y-auto');
  });

  it('main retains overflow-hidden on fullscreen routes (/timer)', () => {
    renderShell('/timer');
    expect(screen.getByRole('main')).toHaveClass('overflow-hidden');
  });
});

// ── child outlet ──────────────────────────────────────────────────────────────

describe('Shell outlet', () => {
  it('renders child route content inside main', () => {
    renderShell('/library');
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });
});
