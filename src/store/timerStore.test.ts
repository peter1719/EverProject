import { describe, it, expect, beforeEach } from 'vitest';
import { useTimerStore } from './timerStore';

const INITIAL_STATE = {
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
  useTimerStore.setState({ ...INITIAL_STATE });
});

// ── startTimer ──────────────────────────────────────────────────────────────

describe('startTimer', () => {
  it('sets phase to running and initialises all fields', () => {
    useTimerStore.getState().startTimer(['p1'], 45);
    const s = useTimerStore.getState();
    expect(s.phase).toBe('running');
    expect(s.remainingSeconds).toBe(45 * 60);
    expect(s.projectIds).toEqual(['p1']);
    expect(s.currentProjectIndex).toBe(0);
    expect(s.skippedProjectIds).toEqual([]);
    expect(s.projectElapsedMs).toEqual({});
    expect(s.comboGroupId).toBeNull();
    expect(s.startedAt).toBeTypeOf('number');
  });

  it('stores comboGroupId when provided', () => {
    useTimerStore.getState().startTimer(['p1', 'p2'], 60, 'combo-abc');
    expect(useTimerStore.getState().comboGroupId).toBe('combo-abc');
  });

  it('resets skippedProjectIds and projectElapsedMs from previous run', () => {
    useTimerStore.setState({
      ...INITIAL_STATE,
      skippedProjectIds: ['old-skip'],
      projectElapsedMs: { 'old': 5000 },
    });
    useTimerStore.getState().startTimer(['p1'], 30);
    const s = useTimerStore.getState();
    expect(s.skippedProjectIds).toEqual([]);
    expect(s.projectElapsedMs).toEqual({});
  });
});

// ── pauseTimer ──────────────────────────────────────────────────────────────

describe('pauseTimer', () => {
  it('transitions running → paused', () => {
    useTimerStore.getState().startTimer(['p1'], 30);
    useTimerStore.getState().pauseTimer();
    expect(useTimerStore.getState().phase).toBe('paused');
  });

  it('is a no-op from idle phase', () => {
    useTimerStore.getState().pauseTimer();
    expect(useTimerStore.getState().phase).toBe('idle');
  });

  it('is a no-op from finished phase', () => {
    useTimerStore.setState({ ...INITIAL_STATE, phase: 'finished' });
    useTimerStore.getState().pauseTimer();
    expect(useTimerStore.getState().phase).toBe('finished');
  });
});

// ── resumeTimer ─────────────────────────────────────────────────────────────

describe('resumeTimer', () => {
  it('transitions paused → running', () => {
    useTimerStore.getState().startTimer(['p1'], 30);
    useTimerStore.getState().pauseTimer();
    useTimerStore.getState().resumeTimer();
    expect(useTimerStore.getState().phase).toBe('running');
  });

  it('is a no-op from idle phase', () => {
    useTimerStore.getState().resumeTimer();
    expect(useTimerStore.getState().phase).toBe('idle');
  });
});

// ── tickTimer ───────────────────────────────────────────────────────────────

describe('tickTimer', () => {
  it('decrements remainingSeconds by 1 when running', () => {
    useTimerStore.setState({ ...INITIAL_STATE, phase: 'running', remainingSeconds: 10 });
    useTimerStore.getState().tickTimer();
    expect(useTimerStore.getState().remainingSeconds).toBe(9);
  });

  it('transitions to finished when remainingSeconds is already 0', () => {
    useTimerStore.setState({ ...INITIAL_STATE, phase: 'running', remainingSeconds: 0 });
    useTimerStore.getState().tickTimer();
    expect(useTimerStore.getState().phase).toBe('finished');
  });

  it('is a no-op when phase is paused', () => {
    useTimerStore.setState({ ...INITIAL_STATE, phase: 'paused', remainingSeconds: 30 });
    useTimerStore.getState().tickTimer();
    expect(useTimerStore.getState().remainingSeconds).toBe(30);
  });

  it('is a no-op when phase is idle', () => {
    useTimerStore.setState({ ...INITIAL_STATE, phase: 'idle', remainingSeconds: 30 });
    useTimerStore.getState().tickTimer();
    expect(useTimerStore.getState().remainingSeconds).toBe(30);
  });
});

// ── advanceCombo ────────────────────────────────────────────────────────────

describe('advanceCombo', () => {
  it('increments currentProjectIndex', () => {
    useTimerStore.setState({
      ...INITIAL_STATE,
      projectIds: ['p1', 'p2', 'p3'],
      currentProjectIndex: 0,
    });
    useTimerStore.getState().advanceCombo();
    expect(useTimerStore.getState().currentProjectIndex).toBe(1);
  });

  it('sets phase to finished on the last project', () => {
    useTimerStore.setState({
      ...INITIAL_STATE,
      projectIds: ['p1', 'p2', 'p3'],
      currentProjectIndex: 2,
    });
    useTimerStore.getState().advanceCombo();
    expect(useTimerStore.getState().phase).toBe('finished');
  });

  it('sets phase to finished for a single-project session', () => {
    useTimerStore.setState({
      ...INITIAL_STATE,
      projectIds: ['p1'],
      currentProjectIndex: 0,
    });
    useTimerStore.getState().advanceCombo();
    expect(useTimerStore.getState().phase).toBe('finished');
  });
});

// ── skipProject ─────────────────────────────────────────────────────────────

describe('skipProject', () => {
  it('appends current project id to skippedProjectIds', () => {
    useTimerStore.setState({
      ...INITIAL_STATE,
      phase: 'running',
      projectIds: ['p1', 'p2'],
      currentProjectIndex: 0,
    });
    useTimerStore.getState().skipProject();
    expect(useTimerStore.getState().skippedProjectIds).toContain('p1');
  });

  it('advances currentProjectIndex to the next project', () => {
    useTimerStore.setState({
      ...INITIAL_STATE,
      phase: 'running',
      projectIds: ['p1', 'p2'],
      currentProjectIndex: 0,
    });
    useTimerStore.getState().skipProject();
    expect(useTimerStore.getState().currentProjectIndex).toBe(1);
  });

  it('sets phase to finished when skipping the last project', () => {
    useTimerStore.setState({
      ...INITIAL_STATE,
      phase: 'running',
      projectIds: ['p1'],
      currentProjectIndex: 0,
    });
    useTimerStore.getState().skipProject();
    expect(useTimerStore.getState().phase).toBe('finished');
  });

  it('accumulates multiple skips', () => {
    useTimerStore.setState({
      ...INITIAL_STATE,
      phase: 'running',
      projectIds: ['p1', 'p2', 'p3'],
      currentProjectIndex: 0,
    });
    useTimerStore.getState().skipProject(); // skip p1
    useTimerStore.getState().skipProject(); // skip p2 → now on p3, still running
    expect(useTimerStore.getState().skippedProjectIds).toEqual(['p1', 'p2']);
    expect(useTimerStore.getState().phase).toBe('running');
    expect(useTimerStore.getState().currentProjectIndex).toBe(2);
  });
});

// ── finishTimer ─────────────────────────────────────────────────────────────

describe('finishTimer', () => {
  it('sets phase to finished from running', () => {
    useTimerStore.getState().startTimer(['p1'], 30);
    useTimerStore.getState().finishTimer();
    expect(useTimerStore.getState().phase).toBe('finished');
  });

  it('sets phase to finished from idle', () => {
    useTimerStore.getState().finishTimer();
    expect(useTimerStore.getState().phase).toBe('finished');
  });
});

// ── resetTimer ──────────────────────────────────────────────────────────────

describe('resetTimer', () => {
  it('returns all fields to INITIAL_STATE after a full run', () => {
    useTimerStore.getState().startTimer(['p1', 'p2'], 90, 'combo-xyz');
    useTimerStore.getState().tickTimer();
    useTimerStore.getState().skipProject();
    useTimerStore.getState().recordProjectElapsed('p1', 5000);
    useTimerStore.getState().resetTimer();

    const s = useTimerStore.getState();
    expect(s.phase).toBe('idle');
    expect(s.remainingSeconds).toBe(0);
    expect(s.projectIds).toEqual([]);
    expect(s.currentProjectIndex).toBe(0);
    expect(s.plannedDurationMinutes).toBe(0);
    expect(s.startedAt).toBeNull();
    expect(s.comboGroupId).toBeNull();
    expect(s.skippedProjectIds).toEqual([]);
    expect(s.projectElapsedMs).toEqual({});
  });
});

// ── recordProjectElapsed ────────────────────────────────────────────────────

describe('recordProjectElapsed', () => {
  it('accumulates ms for the same project', () => {
    useTimerStore.getState().recordProjectElapsed('p1', 1000);
    useTimerStore.getState().recordProjectElapsed('p1', 500);
    expect(useTimerStore.getState().projectElapsedMs['p1']).toBe(1500);
  });

  it('tracks multiple projects independently', () => {
    useTimerStore.getState().recordProjectElapsed('p1', 2000);
    useTimerStore.getState().recordProjectElapsed('p2', 3000);
    const s = useTimerStore.getState();
    expect(s.projectElapsedMs['p1']).toBe(2000);
    expect(s.projectElapsedMs['p2']).toBe(3000);
  });

  it('initialises from 0 for a new project id', () => {
    useTimerStore.getState().recordProjectElapsed('new-p', 750);
    expect(useTimerStore.getState().projectElapsedMs['new-p']).toBe(750);
  });
});
