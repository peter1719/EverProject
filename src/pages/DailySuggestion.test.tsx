import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DailySuggestion } from './DailySuggestion/index';
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

function makeProject(overrides: Partial<Project> & { id: string }): Project {
  return {
    name: overrides.id,
    color: 'indigo',
    estimatedDurationMinutes: 30,
    projectDurationMinutes: 0,
    notes: '',
    isArchived: false,
    createdAt: Date.now() - 1000,
    updatedAt: Date.now() - 1000,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/suggest']}>
      <Routes>
        <Route path="/suggest" element={<DailySuggestion />} />
        <Route path="/timer" element={<div>Timer</div>} />
        <Route path="/combo" element={<div>Combo</div>} />
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

// ── empty state ───────────────────────────────────────────────────────────────

describe('DailySuggestion empty state', () => {
  it('shows EmptyState when no active projects', () => {
    renderPage();
    expect(screen.getByText(/NO PROJECTS/i)).toBeInTheDocument();
  });

  it('still shows a suggestion card when project exceeds selected time', () => {
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', name: 'Long Project', estimatedDurationMinutes: 60 })],
      isHydrated: true,
    });
    renderPage();
    // Default is 45 min, project is 60 — duration no longer gates eligibility
    expect(screen.getByText('Long Project')).toBeInTheDocument();
  });
});

// ── suggestion card ───────────────────────────────────────────────────────────

describe('DailySuggestion suggestion card', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', name: 'Reading', estimatedDurationMinutes: 30 })],
      isHydrated: true,
    });
  });

  it('shows project name when suggestion available', () => {
    renderPage();
    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  it('shows Never done when project has no sessions', () => {
    renderPage();
    // Component renders "Last: Never done"
    expect(screen.getByText(/Never done/i)).toBeInTheDocument();
  });
});

// ── time selector ─────────────────────────────────────────────────────────────

describe('DailySuggestion time selector', () => {
  it('renders all 8 duration buttons including >180', () => {
    renderPage();
    for (const label of ['15', '30', '45', '60', '90', '120', '180', '>180']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('45 is selected by default', () => {
    renderPage();
    const btn45 = screen.getByRole('button', { name: '45' });
    expect(btn45.className).toContain('bg-primary');
  });

  it('clicking a different time button selects it', async () => {
    const user = userEvent.setup();
    renderPage();
    const btn60 = screen.getByRole('button', { name: '60' });
    await user.click(btn60);
    expect(btn60.className).toContain('bg-primary');
  });
});

// ── swipe hint ────────────────────────────────────────────────────────────────

describe('DailySuggestion swipe hint', () => {
  it('hides swipe hint when only 1 project', () => {
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', estimatedDurationMinutes: 30 })],
      isHydrated: true,
    });
    renderPage();
    expect(screen.queryByText(/swipe to change|左右滑動切換/i)).not.toBeInTheDocument();
  });

  it('shows swipe hint when multiple projects exist', () => {
    useProjectStore.setState({
      projects: [
        makeProject({ id: 'p1', estimatedDurationMinutes: 30 }),
        makeProject({ id: 'p2', estimatedDurationMinutes: 30 }),
      ],
      isHydrated: true,
    });
    renderPage();
    expect(screen.getByText(/swipe to change|左右滑動切換/i)).toBeInTheDocument();
  });
});

// ── START TIMER ───────────────────────────────────────────────────────────────

describe('DailySuggestion START TIMER', () => {
  it('navigates to /timer with correct payload', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', name: 'Reading', estimatedDurationMinutes: 30 })],
      isHydrated: true,
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: '30' }));
    await user.click(screen.getByRole('button', { name: /START TIMER/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/timer', {
      state: { projectIds: ['p1'], totalMinutes: 30, origin: '/suggest' },
    });
  });
});

// ── TRY COMBO ────────────────────────────────────────────────────────────────

describe('DailySuggestion TRY COMBO', () => {
  it('navigates to /combo?minutes=N', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', estimatedDurationMinutes: 30 })],
      isHydrated: true,
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: '90' }));
    await user.click(screen.getByRole('button', { name: /TRY COMBO/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/combo?minutes=90');
  });
});

// ── color filter ──────────────────────────────────────────────────────────────

describe('DailySuggestion color filter', () => {
  it('shows filter button', () => {
    useProjectStore.setState({
      projects: [makeProject({ id: 'p1', color: 'indigo' })],
      isHydrated: true,
    });
    renderPage();
    expect(screen.getByRole('button', { name: /filter by color/i })).toBeInTheDocument();
  });

  it('only suggests project matching selected color', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [
        makeProject({ id: 'p1', name: 'Indigo Project', color: 'indigo' }),
        makeProject({ id: 'p2', name: 'Rose Project', color: 'rose' }),
      ],
      isHydrated: true,
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: /filter by color/i }));
    await user.click(screen.getByRole('button', { name: /filter by indigo/i }));

    expect(screen.getByText('Indigo Project')).toBeInTheDocument();
    expect(screen.queryByText('Rose Project')).not.toBeInTheDocument();
  });

  it('shows empty state when no projects match color filter', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [
        makeProject({ id: 'p1', color: 'indigo' }),
        makeProject({ id: 'p2', color: 'rose' }),
      ],
      isHydrated: true,
    });
    renderPage();

    // Select rose filter (rose exists in dropdown)
    await user.click(screen.getByRole('button', { name: /filter by color/i }));
    await user.click(screen.getByRole('button', { name: /filter by rose/i }));

    // Archive the rose project while filter is active;
    // update sessions to trigger a re-render (component subscribes to sessions)
    act(() => {
      useProjectStore.setState({
        projects: [
          makeProject({ id: 'p1', color: 'indigo' }),
          makeProject({ id: 'p2', color: 'rose', isArchived: true }),
        ],
        isHydrated: true,
      });
      useSessionStore.setState({
        sessions: [
          {
            id: 's1',
            projectId: 'p1',
            projectName: 'p1',
            projectColor: 'indigo',
            startedAt: Date.now(),
            endedAt: Date.now(),
            plannedDurationMinutes: 30,
            actualDurationMinutes: 25,
            outcome: 'completed',
            notes: '',
          },
        ],
        isHydrated: true,
      });
    });

    expect(screen.getByText(/沒有符合此顏色的專案|No projects match/i)).toBeInTheDocument();
  });

  it('swipe hint hidden when only 1 project matches filter', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({
      projects: [
        makeProject({ id: 'p1', color: 'indigo' }),
        makeProject({ id: 'p2', color: 'rose' }),
      ],
      isHydrated: true,
    });
    renderPage();

    await user.click(screen.getByRole('button', { name: /filter by color/i }));
    await user.click(screen.getByRole('button', { name: /filter by indigo/i }));

    expect(screen.queryByText(/swipe to change|左右滑動切換/i)).not.toBeInTheDocument();
  });
});
