import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Project, Session } from '@/types';

// ── IDB mock ────────────────────────────────────────────────────────────────
const mockDb = vi.hoisted(() => ({
  getAll: vi.fn<[], Promise<Session[]>>(),
  put: vi.fn<[string, unknown], Promise<void>>(),
}));

vi.mock('@/db', () => ({
  getDB: () => Promise.resolve(mockDb),
}));

import { useSessionStore } from './sessionStore';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeSession(
  overrides: Partial<Session> & { id: string; projectId: string },
): Session {
  return {
    projectName: overrides.projectId,
    projectColor: 'indigo',
    startedAt: Date.now(),
    endedAt: Date.now() + 30 * 60_000,
    plannedDurationMinutes: 30,
    actualDurationMinutes: 30,
    outcome: 'completed',
    notes: '',
    wasCombo: false,
    comboGroupId: null,
    ...overrides,
  };
}

function makeProject(id: string): Project {
  return {
    id,
    name: id,
    color: 'indigo',
    estimatedDurationMinutes: 30,
    notes: '',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function daysAgoMs(n: number): number {
  return Date.now() - n * 86_400_000;
}

/** Midnight UTC of today */
function todayMs(): number {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

beforeEach(() => {
  useSessionStore.setState({ sessions: [], isHydrated: false });
  mockDb.getAll.mockResolvedValue([]);
  mockDb.put.mockResolvedValue(undefined);
});

// ── hydrate ──────────────────────────────────────────────────────────────────

describe('hydrate', () => {
  it('loads sessions and sets isHydrated', async () => {
    const s = makeSession({ id: 's1', projectId: 'p1' });
    mockDb.getAll.mockResolvedValue([s]);
    await useSessionStore.getState().hydrate();
    expect(useSessionStore.getState().sessions).toEqual([s]);
    expect(useSessionStore.getState().isHydrated).toBe(true);
  });
});

// ── addSession ───────────────────────────────────────────────────────────────

describe('addSession', () => {
  it('appends session and calls db.put', async () => {
    await useSessionStore.getState().addSession({
      projectId: 'p1',
      projectName: 'p1',
      projectColor: 'indigo',
      startedAt: Date.now(),
      endedAt: Date.now() + 1800_000,
      plannedDurationMinutes: 30,
      actualDurationMinutes: 30,
      outcome: 'completed',
      notes: '',
      wasCombo: false,
      comboGroupId: null,
    });
    expect(useSessionStore.getState().sessions).toHaveLength(1);
    expect(mockDb.put).toHaveBeenCalledOnce();
  });
});

// ── updateSession ────────────────────────────────────────────────────────────

describe('updateSession', () => {
  it('updates outcome and notes, persists', async () => {
    const s = makeSession({ id: 's1', projectId: 'p1', outcome: 'partial' });
    useSessionStore.setState({ sessions: [s], isHydrated: true });

    await useSessionStore.getState().updateSession('s1', {
      outcome: 'completed',
      notes: 'great run',
    });

    const updated = useSessionStore.getState().sessions[0];
    expect(updated.outcome).toBe('completed');
    expect(updated.notes).toBe('great run');
    expect(mockDb.put).toHaveBeenCalledOnce();
  });

  it('is a no-op for unknown id', async () => {
    const s = makeSession({ id: 's1', projectId: 'p1', outcome: 'partial' });
    useSessionStore.setState({ sessions: [s], isHydrated: true });
    await useSessionStore.getState().updateSession('missing', { outcome: 'completed', notes: '' });
    expect(useSessionStore.getState().sessions[0].outcome).toBe('partial');
  });
});

// ── getTotalSessionCount ──────────────────────────────────────────────────────

describe('getTotalSessionCount', () => {
  it('excludes abandoned sessions', () => {
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', outcome: 'completed' }),
        makeSession({ id: 's2', projectId: 'p1', outcome: 'partial' }),
        makeSession({ id: 's3', projectId: 'p1', outcome: 'abandoned' }),
      ],
      isHydrated: true,
    });
    expect(useSessionStore.getState().getTotalSessionCount()).toBe(2);
  });

  it('returns 0 when all sessions are abandoned', () => {
    useSessionStore.setState({
      sessions: [makeSession({ id: 's1', projectId: 'p1', outcome: 'abandoned' })],
      isHydrated: true,
    });
    expect(useSessionStore.getState().getTotalSessionCount()).toBe(0);
  });
});

// ── getTotalMinutes ───────────────────────────────────────────────────────────

describe('getTotalMinutes', () => {
  it('sums actualDurationMinutes for non-abandoned sessions', () => {
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', outcome: 'completed', actualDurationMinutes: 30 }),
        makeSession({ id: 's2', projectId: 'p1', outcome: 'abandoned', actualDurationMinutes: 45 }),
      ],
      isHydrated: true,
    });
    expect(useSessionStore.getState().getTotalMinutes()).toBe(30);
  });
});

// ── getCurrentStreak ──────────────────────────────────────────────────────────

describe('getCurrentStreak', () => {
  it('returns 0 when no sessions', () => {
    expect(useSessionStore.getState().getCurrentStreak()).toBe(0);
  });

  it('returns 0 when only abandoned sessions today', () => {
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', startedAt: todayMs(), outcome: 'abandoned' }),
      ],
      isHydrated: true,
    });
    expect(useSessionStore.getState().getCurrentStreak()).toBe(0);
  });

  it('returns 1 for a single session today', () => {
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', startedAt: todayMs(), outcome: 'completed' }),
      ],
      isHydrated: true,
    });
    expect(useSessionStore.getState().getCurrentStreak()).toBe(1);
  });

  it('counts consecutive days including today', () => {
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', startedAt: todayMs(), outcome: 'completed' }),
        makeSession({ id: 's2', projectId: 'p1', startedAt: daysAgoMs(1) + 3600_000, outcome: 'completed' }),
        makeSession({ id: 's3', projectId: 'p1', startedAt: daysAgoMs(2) + 3600_000, outcome: 'completed' }),
      ],
      isHydrated: true,
    });
    expect(useSessionStore.getState().getCurrentStreak()).toBe(3);
  });

  it('returns 0 when there is no session today', () => {
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', startedAt: daysAgoMs(1) + 3600_000, outcome: 'completed' }),
      ],
      isHydrated: true,
    });
    expect(useSessionStore.getState().getCurrentStreak()).toBe(0);
  });
});

// ── getDailyActivity ──────────────────────────────────────────────────────────

describe('getDailyActivity', () => {
  it('returns exactly N entries', () => {
    expect(useSessionStore.getState().getDailyActivity(84)).toHaveLength(84);
    expect(useSessionStore.getState().getDailyActivity(7)).toHaveLength(7);
  });

  it('entries are in ascending date order (oldest first)', () => {
    const result = useSessionStore.getState().getDailyActivity(84);
    expect(result[0].date < result[83].date).toBe(true);
  });

  it('correctly counts sessions per day', () => {
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', startedAt: todayMs(), outcome: 'completed' }),
        makeSession({ id: 's2', projectId: 'p1', startedAt: todayMs() + 1000, outcome: 'completed' }),
        makeSession({ id: 's3', projectId: 'p1', startedAt: daysAgoMs(1) + 3600_000, outcome: 'completed' }),
      ],
      isHydrated: true,
    });
    const result = useSessionStore.getState().getDailyActivity(7);
    const todayEntry = result[result.length - 1];
    const yesterdayEntry = result[result.length - 2];
    expect(todayEntry.count).toBe(2);
    expect(yesterdayEntry.count).toBe(1);
  });

  it('excludes abandoned sessions from counts', () => {
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', startedAt: todayMs(), outcome: 'abandoned' }),
      ],
      isHydrated: true,
    });
    const result = useSessionStore.getState().getDailyActivity(7);
    expect(result[result.length - 1].count).toBe(0);
  });
});

// ── getProjectTotals ──────────────────────────────────────────────────────────

describe('getProjectTotals', () => {
  it('sums actualDurationMinutes per project', () => {
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', actualDurationMinutes: 30, outcome: 'completed' }),
        makeSession({ id: 's2', projectId: 'p1', actualDurationMinutes: 30, outcome: 'completed' }),
      ],
      isHydrated: true,
    });
    const result = useSessionStore.getState().getProjectTotals([makeProject('p1')]);
    expect(result[0].totalMinutes).toBe(60);
  });

  it('sorts by totalMinutes descending', () => {
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', actualDurationMinutes: 60, outcome: 'completed' }),
        makeSession({ id: 's2', projectId: 'p2', actualDurationMinutes: 120, outcome: 'completed' }),
      ],
      isHydrated: true,
    });
    const result = useSessionStore.getState().getProjectTotals([
      makeProject('p1'),
      makeProject('p2'),
    ]);
    expect(result[0].projectId).toBe('p2');
    expect(result[1].projectId).toBe('p1');
  });

  it('shows [DELETED] for sessions referencing unknown project', () => {
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'ghost-id', actualDurationMinutes: 30, outcome: 'completed' }),
      ],
      isHydrated: true,
    });
    const result = useSessionStore.getState().getProjectTotals([]);
    expect(result[0].project.name).toBe('[DELETED]');
  });

  it('excludes abandoned sessions from totals', () => {
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', actualDurationMinutes: 30, outcome: 'completed' }),
        makeSession({ id: 's2', projectId: 'p1', actualDurationMinutes: 45, outcome: 'abandoned' }),
      ],
      isHydrated: true,
    });
    const result = useSessionStore.getState().getProjectTotals([makeProject('p1')]);
    expect(result[0].totalMinutes).toBe(30);
  });
});

// ── getSessionsForHistory ─────────────────────────────────────────────────────

describe('getSessionsForHistory', () => {
  it('returns all sessions sorted by startedAt descending', () => {
    const now = Date.now();
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', startedAt: now - 3000 }),
        makeSession({ id: 's2', projectId: 'p1', startedAt: now - 1000 }),
        makeSession({ id: 's3', projectId: 'p1', startedAt: now - 2000 }),
      ],
      isHydrated: true,
    });
    const result = useSessionStore.getState().getSessionsForHistory();
    expect(result[0].id).toBe('s2');
    expect(result[2].id).toBe('s1');
  });

  it('filters by filterProjectId when provided', () => {
    const now = Date.now();
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', startedAt: now }),
        makeSession({ id: 's2', projectId: 'p2', startedAt: now }),
        makeSession({ id: 's3', projectId: 'p1', startedAt: now }),
      ],
      isHydrated: true,
    });
    const result = useSessionStore.getState().getSessionsForHistory('p1');
    expect(result).toHaveLength(2);
    expect(result.every(s => s.projectId === 'p1')).toBe(true);
  });
});

// ── getLastSessionForProject ──────────────────────────────────────────────────

describe('getLastSessionForProject', () => {
  it('returns the most recent session for a project', () => {
    const now = Date.now();
    useSessionStore.setState({
      sessions: [
        makeSession({ id: 's1', projectId: 'p1', startedAt: now - 3000 }),
        makeSession({ id: 's2', projectId: 'p1', startedAt: now - 1000 }),
        makeSession({ id: 's3', projectId: 'p1', startedAt: now - 2000 }),
      ],
      isHydrated: true,
    });
    expect(useSessionStore.getState().getLastSessionForProject('p1')?.id).toBe('s2');
  });

  it('returns undefined for unknown project', () => {
    expect(useSessionStore.getState().getLastSessionForProject('missing')).toBeUndefined();
  });
});
