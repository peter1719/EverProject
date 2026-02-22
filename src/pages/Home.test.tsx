import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Home } from './Home/index';
import { useSettingsStore } from '@/store/settingsStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/db', () => ({
  getDB: () =>
    Promise.resolve({ put: vi.fn().mockResolvedValue(undefined) }),
}));

function renderHome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<div>Library</div>} />
        <Route path="/suggest" element={<div>Suggest</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  useSettingsStore.setState({
    settings: { lastVisitedTab: '/suggest' },
    isHydrated: true,
  } as never);
});

describe('Home redirect', () => {
  it('redirects to lastVisitedTab when hydrated', () => {
    renderHome();
    expect(mockNavigate).toHaveBeenCalledWith('/suggest', { replace: true });
  });

  it('redirects to /library when lastVisitedTab is /library', () => {
    useSettingsStore.setState({
      settings: { lastVisitedTab: '/library' },
      isHydrated: true,
    } as never);
    renderHome();
    expect(mockNavigate).toHaveBeenCalledWith('/library', { replace: true });
  });

  it('renders nothing (no visible content)', () => {
    renderHome();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not navigate before hydration', () => {
    useSettingsStore.setState({
      settings: { lastVisitedTab: '/suggest' },
      isHydrated: false,
    } as never);
    renderHome();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
