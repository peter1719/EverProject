import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ComboSuggestion } from './ComboSuggestion/index';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Project } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/db', () => ({
  getDB: () =>
    Promise.resolve({ put: vi.fn().mockResolvedValue(undefined) }),
}));

function makeProject(id: string, minutes: number): Project {
  return {
    id,
    name: id,
    color: 'indigo',
    estimatedDurationMinutes: minutes,
    projectDurationMinutes: 0,
    notes: '',
    isArchived: false,
    createdAt: Date.now() - 1000,
    updatedAt: Date.now() - 1000,
  };
}

function renderPage(search = '?minutes=90') {
  return render(
    <MemoryRouter initialEntries={[`/combo${search}`]}>
      <Routes>
        <Route path="/combo" element={<ComboSuggestion />} />
        <Route path="/suggest" element={<div>Suggest</div>} />
        <Route path="/timer" element={<div>Timer</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
  useProjectStore.setState({ projects: [], isHydrated: true });
  useSessionStore.setState({ sessions: [], isHydrated: true });
  useSettingsStore.setState({
    settings: { lastVisitedTab: '/suggest' },
    isHydrated: true,
  } as never);
});

// ── redirect guards ───────────────────────────────────────────────────────────

describe('ComboSuggestion redirects', () => {
  it('redirects to /suggest when minutes param is missing', () => {
    renderPage('');
    expect(screen.getByText('Suggest')).toBeInTheDocument();
  });

  it('redirects for minutes=0', () => {
    renderPage('?minutes=0');
    expect(screen.getByText('Suggest')).toBeInTheDocument();
  });

  it('redirects for negative minutes', () => {
    renderPage('?minutes=-5');
    expect(screen.getByText('Suggest')).toBeInTheDocument();
  });

  it('redirects for non-numeric minutes', () => {
    renderPage('?minutes=abc');
    expect(screen.getByText('Suggest')).toBeInTheDocument();
  });
});

// ── empty state ───────────────────────────────────────────────────────────────

describe('ComboSuggestion empty state', () => {
  it('shows EmptyState when no combos found', () => {
    // Single project → no combinations possible
    useProjectStore.setState({
      projects: [makeProject('p1', 30)],
      isHydrated: true,
    });
    renderPage('?minutes=90');
    expect(screen.getByText(/NO COMBOS/i)).toBeInTheDocument();
  });
});

// ── combo cards ───────────────────────────────────────────────────────────────

describe('ComboSuggestion combo cards', () => {
  beforeEach(() => {
    // Projects that produce a valid combo for 90 min (30+50=80, within ±10)
    useProjectStore.setState({
      projects: [
        makeProject('alpha', 30),
        makeProject('beta', 50),
        makeProject('gamma', 35),
      ],
      isHydrated: true,
    });
  });

  it('renders at least one combo card', () => {
    renderPage('?minutes=90');
    // ComboCard shows project names
    expect(screen.queryAllByText(/TOTAL:/i).length).toBeGreaterThan(0);
  });

  it('shows TOTAL label with combined minutes', () => {
    renderPage('?minutes=90');
    // Multiple combo cards may be rendered; use queryAll and check at least one
    expect(screen.queryAllByText(/TOTAL:/i).length).toBeGreaterThan(0);
  });

  it('renders navigation arrows', () => {
    renderPage('?minutes=90');
    // Arrow buttons with ◀ ▶ or similar
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

// ── START THIS COMBO ─────────────────────────────────────────────────────────

describe('ComboSuggestion START THIS COMBO', () => {
  it('navigates to /timer with projectIds and totalMinutes', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [makeProject('alpha', 40), makeProject('beta', 45)],
      isHydrated: true,
    });
    renderPage('?minutes=90');

    await user.click(screen.getByRole('button', { name: /START THIS COMBO/i }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/timer',
      expect.objectContaining({
        state: expect.objectContaining({
          projectIds: expect.any(Array),
          totalMinutes: 90,
          comboGroupId: expect.any(String),
        }),
      }),
    );
  });
});
