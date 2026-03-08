import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PomodoroTimer } from './PomodoroTimer/index';
import { useProjectStore } from '@/store/projectStore';
import { useSessionStore } from '@/store/sessionStore';
import { useTimerStore } from '@/store/timerStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Project, TimerDraft } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/db', () => ({
  getDB: () => Promise.resolve({
    put: vi.fn().mockResolvedValue(undefined),
    getAllFromIndex: vi.fn().mockResolvedValue([]),
  }),
}));

// In-memory timerDraft store so integration tests can test save → load roundtrip
let _storedDraft: TimerDraft | undefined;
vi.mock('@/db/timerDraft', () => ({
  saveTimerDraft: vi.fn(async (state: Parameters<typeof import('@/db/timerDraft').saveTimerDraft>[0]) => {
    if (state.phase !== 'running' && state.phase !== 'paused') return;
    _storedDraft = {
      key: 'timer_draft',
      phase: state.phase as 'running' | 'paused',
      projectIds: state.projectIds,
      currentProjectIndex: state.currentProjectIndex,
      plannedDurationMinutes: state.plannedDurationMinutes,
      remainingSeconds: state.remainingSeconds,
      startedAt: state.startedAt,
      comboGroupId: state.comboGroupId,
      skippedProjectIds: state.skippedProjectIds,
      projectElapsedMs: state.projectElapsedMs,
      projectAllocatedMinutes: state.projectAllocatedMinutes,
    };
  }),
  loadTimerDraft: vi.fn(async () => _storedDraft),
  clearTimerDraft: vi.fn(async () => { _storedDraft = undefined; }),
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
  projectAllocatedMinutes: {} as Record<string, number>,
};

beforeEach(() => {
  mockNavigate.mockClear();
  _storedDraft = undefined;
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
  it('redirects to /library when no router state', async () => {
    renderTimer(null);
    await screen.findByText('Library');
  });

  it('redirects when projectIds is empty', async () => {
    renderTimer({ projectIds: [], totalMinutes: 30 });
    await screen.findByText('Library');
  });
});

// ── timer display ─────────────────────────────────────────────────────────────

describe('PomodoroTimer display', () => {
  it('calls startTimer on mount for idle phase', async () => {
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    // Wait for async IDB draft check (no draft → draftChecked=true → TimerPage mounts → startTimer)
    await act(async () => {});
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

  it('starts a fresh timer when mounting with stale finished phase from previous session', async () => {
    // Regression: after natural completion, resetTimer is never called.
    // Next mount sees phase='finished', mount effect guard (phase === 'idle') fails,
    // so startTimer is never called and the timer loop immediately navigates to /complete.
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'finished' as const,
      projectIds: ['old-project'],
      remainingSeconds: 0,
      startedAt: Date.now() - 90_000,
    });

    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    await act(async () => {});

    // New session must have started — phase running, projectIds updated
    expect(useTimerStore.getState().phase).toBe('running');
    expect(useTimerStore.getState().projectIds).toEqual(['p1']);
    expect(useTimerStore.getState().remainingSeconds).toBe(30 * 60);
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

  it('resets remainingSeconds to next project duration after confirming skip', async () => {
    // Regression test: p1 is 30 min, p2 is 15 min.
    // User skips p1 with 1793 secs still remaining (> p2's 900).
    // Without the fix: elapsed = 900 - 1793 = -893 → displayed as "-14:-53".
    useProjectStore.setState({
      projects: [makeProject('p1', 30), makeProject('p2', 15)],
      isHydrated: true,
    });
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1', 'p2'],
      currentProjectIndex: 0,
      remainingSeconds: 1793,
      projectAllocatedMinutes: { p1: 30, p2: 15 },
    });

    const user = userEvent.setup();
    renderTimer({
      projectIds: ['p1', 'p2'],
      totalMinutes: 45,
      comboGroupId: 'combo-1',
      projectAllocatedMinutes: { p1: 30, p2: 15 },
    });

    await user.click(screen.getByRole('button', { name: /skip project/i }));
    await user.click(screen.getByRole('button', { name: 'YES, SKIP' }));

    expect(useTimerStore.getState().currentProjectIndex).toBe(1);
    // Must be p2's 15 min = 900 secs, not the stale 1793 from p1
    expect(useTimerStore.getState().remainingSeconds).toBe(15 * 60);
  });

  it('falls back to estimatedDurationMinutes when no allocation exists for next project', async () => {
    // Combos always have allocations, but guard against missing entries.
    useProjectStore.setState({
      projects: [makeProject('p1', 30), makeProject('p2', 20)],
      isHydrated: true,
    });
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1', 'p2'],
      currentProjectIndex: 0,
      remainingSeconds: 1793,
      projectAllocatedMinutes: { p1: 30 }, // p2 intentionally missing
    });

    const user = userEvent.setup();
    renderTimer({
      projectIds: ['p1', 'p2'],
      totalMinutes: 50,
      comboGroupId: 'combo-1',
      projectAllocatedMinutes: { p1: 30 },
    });

    await user.click(screen.getByRole('button', { name: /skip project/i }));
    await user.click(screen.getByRole('button', { name: 'YES, SKIP' }));

    expect(useTimerStore.getState().currentProjectIndex).toBe(1);
    // Falls back to p2's estimatedDurationMinutes = 20 min = 1200 secs
    expect(useTimerStore.getState().remainingSeconds).toBe(20 * 60);
  });
});

// ── notes button & detail sheet ───────────────────────────────────────────────

describe('PomodoroTimer notes button', () => {
  beforeEach(() => {
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1'],
      remainingSeconds: 1800,
    });
  });

  it('renders a notes button next to the project name', () => {
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    expect(screen.getByRole('button', { name: /notes/i })).toBeInTheDocument();
  });

  it('clicking notes button opens the detail sheet', async () => {
    const user = userEvent.setup();
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    // Sheet content (TODO tab) not visible before opening
    expect(screen.queryByText('TODO')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /notes/i }));
    // Sheet is open: both Notes and TODO tabs render
    expect(screen.getByText('TODO')).toBeInTheDocument();
  });

  it('pause icon button has no visible text (icon-only)', () => {
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    const pauseBtn = screen.getByRole('button', { name: /pause/i });
    expect(pauseBtn.textContent?.trim()).toBe('');
  });

  it('stop icon button has no visible text (icon-only)', () => {
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });
    const stopBtn = screen.getByRole('button', { name: /stop/i });
    expect(stopBtn.textContent?.trim()).toBe('');
  });

  it('skip icon is disabled on the last project of a combo', () => {
    useProjectStore.setState({
      projects: [makeProject('p1'), makeProject('p2', 30)],
      isHydrated: true,
    });
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1', 'p2'],
      currentProjectIndex: 1,
      remainingSeconds: 1800,
    });
    renderTimer({ projectIds: ['p1', 'p2'], totalMinutes: 60, comboGroupId: 'combo-1' });
    expect(screen.getByRole('button', { name: /skip/i })).toBeDisabled();
  });
});

// ── redirect guards (extended) ────────────────────────────────────────────────

describe('PomodoroTimer redirect guards — refresh with draft in IDB', () => {
  it('auto-restores from draft on /timer refresh (no router state, store idle, draft exists)', async () => {
    // Simulate: user refreshes on /timer
    // - timerStore is idle (ephemeral, reset on refresh)
    // - IDB has a saved draft from the previous session
    _storedDraft = {
      key: 'timer_draft',
      phase: 'running',
      projectIds: ['p1'],
      currentProjectIndex: 0,
      plannedDurationMinutes: 30,
      remainingSeconds: 600, // 10 min left
      startedAt: Date.now() - 20 * 60_000,
      comboGroupId: null,
      skippedProjectIds: [],
      projectElapsedMs: { p1: 20 * 60_000 },
      projectAllocatedMinutes: {},
    };

    renderTimer(null); // no router state — simulates refresh

    // Must NOT redirect to /library
    expect(screen.queryByText('Library')).not.toBeInTheDocument();
    // Must show timer with restored remaining time
    await screen.findByText('10:00');
    expect(useTimerStore.getState().remainingSeconds).toBe(600);
    expect(useTimerStore.getState().phase).toBe('running');
  });

  it('redirects to /library when no router state and no draft exists', async () => {
    _storedDraft = undefined;

    renderTimer(null);

    await screen.findByText('Library');
  });

  it('restores from draft even when router state is present (F5 refresh scenario)', async () => {
    // F5 refresh: browser history preserves router state, but timerStore is reset to idle.
    // IDB has a draft with 10 min remaining. The draft must win — do NOT restart from 30 min.
    _storedDraft = {
      key: 'timer_draft',
      phase: 'running',
      projectIds: ['p1'],
      currentProjectIndex: 0,
      plannedDurationMinutes: 30,
      remainingSeconds: 600, // 10 min left
      startedAt: Date.now() - 20 * 60_000,
      comboGroupId: null,
      skippedProjectIds: [],
      projectElapsedMs: { p1: 20 * 60_000 },
      projectAllocatedMinutes: {},
    };

    // routerState still present (browser history), timerStore is idle (page refreshed)
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });

    // Must NOT restart from 30:00 — must show restored 10:00
    await screen.findByText('10:00');
    expect(screen.queryByText('30:00')).not.toBeInTheDocument();
    expect(useTimerStore.getState().remainingSeconds).toBe(600);
    expect(useTimerStore.getState().phase).toBe('running');
  });
});

describe('PomodoroTimer redirect guards — store already restored', () => {
  it('does NOT redirect to /library when store has running state (restoreTimer already called)', () => {
    // Scenario: TimerDraftRecovery called restoreTimer, then navigate('/timer') WITHOUT state
    // PomodoroTimer must NOT redirect — it should use the store state
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1'],
      plannedDurationMinutes: 30,
      remainingSeconds: 600,
      startedAt: Date.now() - 20 * 60_000,
    });

    renderTimer(null); // no router state — simulates navigate('/timer') without state

    // Should NOT redirect to /library
    expect(screen.queryByText('Library')).not.toBeInTheDocument();
    // Should show the timer UI
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });
});

// ── crash recovery (重整 / 強制關閉後恢復) ─────────────────────────────────────

describe('PomodoroTimer crash recovery', () => {
  it('does NOT reset timer when store is already running (restoreTimer was called)', () => {
    // Simulate what happens after user refreshes:
    // TimerDraftRecovery calls restoreTimer → phase='running', remainingSeconds=600
    // Then navigates to /timer with the original router state
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1'],
      plannedDurationMinutes: 30,
      remainingSeconds: 600, // 10 min remaining (was a 30-min session, 20 min elapsed)
      startedAt: Date.now() - 20 * 60_000,
      projectElapsedMs: { p1: 20 * 60_000 },
    });

    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });

    // Mount effect must NOT call startTimer — remainingSeconds must stay at 600
    expect(useTimerStore.getState().phase).toBe('running');
    expect(useTimerStore.getState().remainingSeconds).toBe(600);
  });

  it('displays the restored remaining time (10:00), NOT the full planned time (30:00)', () => {
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1'],
      plannedDurationMinutes: 30,
      remainingSeconds: 600,
    });

    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });

    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.queryByText('30:00')).not.toBeInTheDocument();
  });

  it('timer immediately running after restore (no extra Resume press needed)', () => {
    useTimerStore.setState({
      ...INITIAL_TIMER_STATE,
      phase: 'running',
      projectIds: ['p1'],
      plannedDurationMinutes: 30,
      remainingSeconds: 600,
    });

    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });

    // Phase must be 'running' immediately — user should NOT need to press Resume
    expect(useTimerStore.getState().phase).toBe('running');
    expect(useTimerStore.getState().remainingSeconds).toBe(600);
  });

  it('full roundtrip: save draft → refresh (reset store) → load draft → restore → PomodoroTimer shows correct time', async () => {
    const { saveTimerDraft, loadTimerDraft } = await import('@/db/timerDraft');

    // 1. Timer is running with 10 min left (20 min elapsed from a 30-min session)
    useTimerStore.getState().startTimer(['p1'], 30);
    useTimerStore.setState({ remainingSeconds: 600 }); // simulate 20 min elapsed

    // 2. Auto-save fires (normally triggered by useTimer's effect)
    await act(async () => {
      await saveTimerDraft(useTimerStore.getState());
    });

    // 3. Simulate refresh: timerStore resets to idle (ephemeral store cleared)
    useTimerStore.getState().resetTimer();
    expect(useTimerStore.getState().phase).toBe('idle');
    expect(useTimerStore.getState().remainingSeconds).toBe(0);

    // 4. TimerDraftRecovery loads draft from IDB
    const draft = await loadTimerDraft();
    expect(draft).toBeDefined();
    expect(draft!.remainingSeconds).toBe(600);
    expect(draft!.plannedDurationMinutes).toBe(30);

    // 5. User clicks "Continue" → restoreTimer is called
    useTimerStore.getState().restoreTimer(draft!);
    expect(useTimerStore.getState().phase).toBe('running');
    expect(useTimerStore.getState().remainingSeconds).toBe(600);

    // 6. Navigate to /timer — PomodoroTimer mounts with original router state
    renderTimer({ projectIds: ['p1'], totalMinutes: 30 });

    // 7. Must show 10:00, NOT 30:00 (i.e. startTimer was NOT called by mount effect)
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.queryByText('30:00')).not.toBeInTheDocument();
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
