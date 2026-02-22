import { describe, it, expect } from 'vitest';
import { suggestProject, getDurationFitScore, getDaysSinceLastSession } from '../suggestion';
import type { Project, Session, SuggestionContext } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeProject(overrides: Partial<Project> & { id: string }): Project {
  return {
    name: overrides.id,
    color: 'indigo',
    estimatedDurationMinutes: 30,
    notes: '',
    isArchived: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeSession(projectId: string, daysAgo: number): Session {
  const startedAt = Date.now() - daysAgo * 86_400_000;
  return {
    id: `session-${projectId}-${daysAgo}`,
    projectId,
    projectName: projectId,
    projectColor: 'indigo',
    startedAt,
    endedAt: startedAt + 30 * 60 * 1000,
    plannedDurationMinutes: 30,
    actualDurationMinutes: 30,
    outcome: 'completed',
    notes: '',
    wasCombo: false,
    comboGroupId: null,
  };
}

function makeContext(
  projects: Project[],
  sessions: Session[],
  availableMinutes: number,
  seed = 0,
): SuggestionContext {
  return { projects, sessions, availableMinutes, seed };
}

// ── suggestProject ─────────────────────────────────────────────────────────

describe('suggestProject', () => {
  it('returns null when no projects exist', () => {
    expect(suggestProject(makeContext([], [], 45))).toBeNull();
  });

  it('returns null when no project fits the available time', () => {
    const p = makeProject({ id: 'p1', estimatedDurationMinutes: 60 });
    expect(suggestProject(makeContext([p], [], 30))).toBeNull();
  });

  it('returns the only eligible project', () => {
    const p = makeProject({ id: 'p1', estimatedDurationMinutes: 30 });
    expect(suggestProject(makeContext([p], [], 45))).toEqual(p);
  });

  it('excludes projects that exceed availableMinutes', () => {
    const fits = makeProject({ id: 'fits', estimatedDurationMinutes: 30 });
    const tooBig = makeProject({ id: 'tooBig', estimatedDurationMinutes: 90 });
    const result = suggestProject(makeContext([fits, tooBig], [], 45));
    expect(result?.id).toBe('fits');
  });

  it('favours a neglected project over a recently-worked one', () => {
    const neglected = makeProject({ id: 'neglected', estimatedDurationMinutes: 30 });
    const recent = makeProject({ id: 'recent', estimatedDurationMinutes: 30 });

    const sessions = [
      makeSession('recent', 0), // worked on today
    ];

    // Run 100 samples with different seeds — neglected should win ~70% of the time
    let neglectedWins = 0;
    for (let seed = 0; seed < 100; seed++) {
      const result = suggestProject(makeContext([neglected, recent], sessions, 60, seed));
      if (result?.id === 'neglected') neglectedWins++;
    }
    expect(neglectedWins).toBeGreaterThan(60); // ≥60% over 100 samples
  });

  it('returns a project for every seed without throwing', () => {
    const projects = [
      makeProject({ id: 'a', estimatedDurationMinutes: 30 }),
      makeProject({ id: 'b', estimatedDurationMinutes: 45 }),
      makeProject({ id: 'c', estimatedDurationMinutes: 60 }),
    ];
    for (let seed = 0; seed < 50; seed++) {
      expect(() => suggestProject(makeContext(projects, [], 90, seed))).not.toThrow();
    }
  });

  it('excludes archived projects (store filters before calling suggestProject)', () => {
    const active = makeProject({ id: 'active', estimatedDurationMinutes: 30 });
    // The store passes only active projects; verify the algorithm returns the active one
    const result = suggestProject(makeContext([active], [], 60));
    expect(result?.id).toBe('active');
  });
});

// ── getDurationFitScore ────────────────────────────────────────────────────

describe('getDurationFitScore', () => {
  it('returns 1.0 when project exactly fills available time', () => {
    expect(getDurationFitScore(45, 45)).toBe(1);
  });

  it('returns 0 when project exceeds available time', () => {
    expect(getDurationFitScore(60, 45)).toBe(0);
  });

  it('returns partial score for partial fill', () => {
    // 30 min in 60 min available: slack = 30, score = 1 - 30/60 = 0.5
    expect(getDurationFitScore(30, 60)).toBeCloseTo(0.5);
  });
});

// ── getDaysSinceLastSession ────────────────────────────────────────────────

describe('getDaysSinceLastSession', () => {
  it('returns null when project has no sessions', () => {
    expect(getDaysSinceLastSession('p1', [])).toBeNull();
  });

  it('returns approximate days since most recent session', () => {
    const sessions = [makeSession('p1', 5), makeSession('p1', 10)];
    const days = getDaysSinceLastSession('p1', sessions);
    expect(days).toBeGreaterThan(4.9);
    expect(days).toBeLessThan(5.1);
  });

  it('ignores sessions from other projects', () => {
    const sessions = [makeSession('other', 1)];
    expect(getDaysSinceLastSession('p1', sessions)).toBeNull();
  });
});
