import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PomodoroTimer } from './PomodoroTimer/index';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTimerStore } from '@/store/timerStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Project } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/db', () => ({
  getDB: () => Promise.resolve({ put: vi.fn().mockResolvedValue(undefined) }),
}));

// Stub useTimer hook to prevent rAF loops in jsdom
vi.mock('@/hooks/useTimer', () => ({
  useTimer: vi.fn(),
}));

function makeProject(id: string, minutes = 30): Project {
  return {
    id,
    name: id.toUpperCase(),
    color: 'indigo',
    estimatedDurationMinutes: minutes,
    notes: '',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function renderTimer(state: Record<string, unknown> | null = { projectIds: ['p1'], totalMinutes: 30 }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/timer', state }]}>
      <Routes>
        <Route path="/timer" element={<PomodoroTimer />} />
        <Route path="/library" element={<div>Library</div>} />
        <Route path="/complete" element={<div>Complete</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const INITIAL_TIMER_STATE = {
  phase: 'idle' as const,
  projectIds: [] as string[],
  currentProjectIndex: 0,
  plannedDurationMinutes: 0,
  remainingSeconds: 0,
  startedAt: null,
  comboGroupId: null,
  skippedProjectIds: [] as string[],
  projectElapsedMs: {} as Record<string, number>,
};

beforeEach(() => {
  mockNavigate.mockClear();
  useProjectStore.setState({
    projects: [makeProject('p1')],
    isHydrated: true,
  });
  useSessionStore.setState({ sessions: [], isHydrated: true });
  useTimerStore.setState({ ...INITIAL_TIMER_STATE });
  useSettingsStore.setState({
    settings: { lastVisitedTab: '/suggest' },
    isHydrated: true,
  } as never);
});

// ── redirect guards ───────────────────────────────────────────────────────────

describe('PomodoroTimer redirect guards', () => {
  it('redirects to /library when no router state', () => {
    renderTimer(null);
    expect(screen.getByText('Library')).toBeInTheDocument();
  });

  it('redirects when projectIds is empty', () => {
    renderTimer({ projectIds: [], totalMinutes: 30 });
    expect(screen.getByText('Library')).toBeInTheDocument();
  });
});

// ── timer display ─────────────────────────────────────────────────────────────

describe('PomodoroTimer display', () => {
  it('calls startTimer on mount for idle phase', () => {
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    // startTimer should have been called — timer store moves to running
    // (Since useTimer is mocked, startTimer is called directly in TimerPage's useEffect)
    expect(useTimerStore.getState().phase).toBe('running');
  });

  it('shows MM:SS countdown display', () => {
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1'],
      remainingSeconds: 2700,
    });
    renderTimer({ projectIds: ['p1'], totalMinutes: 45 });
    expect(screen.getByText('45:00')).toBeInTheDocument();
  });

  it('shows 01:30 for 90 remaining seconds', () => {
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1'],
      remainingSeconds: 90,
    });
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    expect(screen.getByText('01:30')).toBeInTheDocument();
  });

  it('shows project name', () => {
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1'],
      remainingSeconds: 1800,
    });
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    expect(screen.getByText('P1')).toBeInTheDocument();
  });
});

// ── controls ──────────────────────────────────────────────────────────────────

describe('PomodoroTimer controls', () => {
  beforeEach(() => {
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1'],
      remainingSeconds: 1800,
    });
  });

  it('shows PAUSE button when running', () => {
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    expect(screen.getByRole('button', { name: /PAUSE/i })).toBeInTheDocument();
  });

  it('PAUSE button transitions phase to paused', async () => {
    const user = userEvent.setup();
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    await user.click(screen.getByRole('button', { name: /PAUSE/i }));
    expect(useTimerStore.getState().phase).toBe('paused');
  });

  it('shows STOP & LOG button while running', () => {
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    expect(screen.getByRole('button', { name: /STOP/i })).toBeInTheDocument();
  });

  it('shows RESUME and STOP & LOG when paused', async () => {
    const user = userEvent.setup();
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    await user.click(screen.getByRole('button', { name: /PAUSE/i }));
    expect(screen.getByRole('button', { name: /RESUME/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /STOP/i })).toBeInTheDocument();
  });

  it('STOP & LOG opens confirmation dialog', async () => {
    const user = userEvent.setup();
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    await user.click(screen.getByRole('button', { name: /STOP/i }));
    expect(screen.getByText(/Stop session/i)).toBeInTheDocument();
  });

  it('RESUME transitions phase back to running', async () => {
    const user = userEvent.setup();
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    await user.click(screen.getByRole('button', { name: /PAUSE/i }));
    await user.click(screen.getByRole('button', { name: /RESUME/i }));
    expect(useTimerStore.getState().phase).toBe('running');
  });

  it('QUIT button opens confirmation dialog', async () => {
    const user = userEvent.setup();
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    await user.click(screen.getByRole('button', { name: /QUIT/i }));
    expect(screen.getByText(/Quit session/i)).toBeInTheDocument();
  });
});

// ── SKIP button ───────────────────────────────────────────────────────────────

describe('PomodoroTimer SKIP button', () => {
  it('SKIP button is disabled for single-project sessions', () => {
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1'],
      currentProjectIndex: 0,
      remainingSeconds: 1800,
    });
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    const skipBtn = screen.queryByRole('button', { name: /SKIP/i });
    if (skipBtn) {
      expect(skipBtn).toBeDisabled();
    }
    // Alternatively the button may not be rendered at all for single projects
  });

  it('SKIP is enabled on a non-last project of a combo', () => {
    useProjectStore.setState({
      projects: [makeProject('p1'), makeProject('p2', 30)],
      isHydrated: true,
    });
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1', 'p2'],
      currentProjectIndex: 0,
      remainingSeconds: 1800,
    });
    renderTimer({ projectIds: ['p1', 'p2'], totalMinutes: 60, comboGroupId: 'combo-1' });
    const skipBtn = screen.getByRole('button', { name: /SKIP/i });
    expect(skipBtn).not.toBeDisabled();
  });
});

// ── combo pills ───────────────────────────────────────────────────────────────

describe('PomodoroTimer combo pills', () => {
  it('renders no pills for single-project session', () => {
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1'],
      remainingSeconds: 1800,
    });
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    // Pills are rendered with "PROJECT N OF M" only for combos
    expect(screen.queryByText(/PROJECT \d OF \d/)).not.toBeInTheDocument();
  });

  it('renders PROJECT N OF M subtitle for combos', () => {
    useProjectStore.setState({
      projects: [makeProject('p1'), makeProject('p2', 30)],
      isHydrated: true,
    });
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1', 'p2'],
      currentProjectIndex: 0,
      remainingSeconds: 1800,
    });
    renderTimer({ projectIds: ['p1', 'p2'], totalMinutes: 60 });
    expect(screen.getByText(/PROJECT 1 OF 2/i)).toBeInTheDocument();
  });
});
