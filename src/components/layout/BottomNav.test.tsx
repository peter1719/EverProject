import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { useSettingsStore } from '@/store/settingsStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/db', () => ({
  getDB: () => Promise.resolve({ put: vi.fn().mockResolvedValue(undefined) }),
}));

function renderNav(path = '/library') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  useSettingsStore.setState({
    settings: { lastVisitedTab: '/suggest' },
    isHydrated: true,
  });
});

// ── rendering ────────────────────────────────────────────────────────────────

describe('BottomNav rendering', () => {
  it('renders three tab buttons', () => {
    renderNav();
    expect(screen.getByText('Library')).toBeInTheDocument();
    expect(screen.getByText('Suggest')).toBeInTheDocument();
    expect(screen.getByText('Stats')).toBeInTheDocument();
  });

  it('renders icon glyphs for each tab', () => {
    renderNav();
    expect(screen.getByText('▤')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
    expect(screen.getByText('▦')).toBeInTheDocument();
  });
});

// ── active state ──────────────────────────────────────────────────────────────

describe('BottomNav active state', () => {
  it('active tab has aria-current="page"', () => {
    renderNav('/library');
    const libraryBtn = screen.getByText('Library').closest('button')!;
    expect(libraryBtn).toHaveAttribute('aria-current', 'page');
  });

  it('inactive tabs have no aria-current', () => {
    renderNav('/library');
    const suggestBtn = screen.getByText('Suggest').closest('button')!;
    const statsBtn = screen.getByText('Stats').closest('button')!;
    expect(suggestBtn).not.toHaveAttribute('aria-current');
    expect(statsBtn).not.toHaveAttribute('aria-current');
  });

  it('Suggest is active on /suggest route', () => {
    renderNav('/suggest');
    const btn = screen.getByText('Suggest').closest('button')!;
    expect(btn).toHaveAttribute('aria-current', 'page');
  });

  it('Stats is active on /dashboard route', () => {
    renderNav('/dashboard');
    const btn = screen.getByText('Stats').closest('button')!;
    expect(btn).toHaveAttribute('aria-current', 'page');
  });

  it('active tab has primary-container pill background class', () => {
    renderNav('/library');
    const btn = screen.getByText('Library').closest('button')!;
    expect(btn.className).toContain('bg-primary-container');
  });

  it('inactive tabs have on-surface-variant text color class', () => {
    renderNav('/library');
    const btn = screen.getByText('Suggest').closest('button')!;
    expect(btn.className).toContain('text-on-surface-variant');
  });
});

// ── navigation ───────────────────────────────────────────────────────────────

describe('BottomNav navigation', () => {
  it('clicking Suggest navigates to /suggest', async () => {
    const user = userEvent.setup();
    renderNav('/library');
    await user.click(screen.getByText('Suggest').closest('button')!);
    expect(mockNavigate).toHaveBeenCalledWith('/suggest');
  });

  it('clicking Library navigates to /library', async () => {
    const user = userEvent.setup();
    renderNav('/suggest');
    await user.click(screen.getByText('Library').closest('button')!);
    expect(mockNavigate).toHaveBeenCalledWith('/library');
  });

  it('clicking Stats navigates to /dashboard', async () => {
    const user = userEvent.setup();
    renderNav('/library');
    await user.click(screen.getByText('Stats').closest('button')!);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('clicking a tab calls setLastVisitedTab with the tab path', async () => {
    const user = userEvent.setup();
    const setLastVisitedTab = vi.fn().mockResolvedValue(undefined);
    useSettingsStore.setState(prev => ({ ...prev, setLastVisitedTab }));

    renderNav('/library');
    await user.click(screen.getByText('Suggest').closest('button')!);
    expect(setLastVisitedTab).toHaveBeenCalledWith('/suggest');
  });
});
