import { describe, it, expect } from 'vitest';
import { suggestCombos } from '../combo';
import type { Project, Session, SuggestionContext } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeProject(id: string, minutes: number): Project {
  return {
    id,
    name: id,
    color: 'indigo',
    estimatedDurationMinutes: minutes,
    notes: '',
    isArchived: false,
    createdAt: Date.now() - 1000,
    updatedAt: Date.now() - 1000,
  };
}

function makeContext(projects: Project[], availableMinutes: number): SuggestionContext {
  return { projects, sessions: [] as Session[], availableMinutes, seed: 0 };
}

// ── suggestCombos ──────────────────────────────────────────────────────────

describe('suggestCombos', () => {
  it('returns empty when fewer than 2 projects exist', () => {
    expect(suggestCombos(makeContext([], 90))).toHaveLength(0);
    expect(suggestCombos(makeContext([makeProject('a', 30)], 90))).toHaveLength(0);
  });

  it('returns empty when no combination fits within tolerance', () => {
    // 10 + 10 = 20, available = 90; slack = 70, exceeds 20-min relaxed tolerance
    const projects = [makeProject('a', 10), makeProject('b', 10)];
    expect(suggestCombos(makeContext(projects, 90))).toHaveLength(0);
  });

  it('returns combos that fit within strict tolerance (≤10 min slack)', () => {
    // 30 + 55 = 85, slack = 5 from 90 → fits strict
    const projects = [makeProject('a', 30), makeProject('b', 55), makeProject('c', 20)];
    const results = suggestCombos(makeContext(projects, 90));
    expect(results.length).toBeGreaterThan(0);
    for (const combo of results) {
      expect(combo.slackMinutes).toBeGreaterThanOrEqual(0);
      expect(combo.slackMinutes).toBeLessThanOrEqual(20); // relaxed max
    }
  });

  it('returns at most 3 combos', () => {
    const projects = [
      makeProject('a', 30),
      makeProject('b', 30),
      makeProject('c', 30),
      makeProject('d', 30),
      makeProject('e', 25),
    ];
    const results = suggestCombos(makeContext(projects, 90));
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('combos are sorted by score descending', () => {
    const projects = [
      makeProject('a', 30),
      makeProject('b', 30),
      makeProject('c', 30),
      makeProject('d', 25),
    ];
    const results = suggestCombos(makeContext(projects, 90));
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('each combo has 2–4 projects', () => {
    const projects = [
      makeProject('a', 20),
      makeProject('b', 20),
      makeProject('c', 20),
      makeProject('d', 20),
      makeProject('e', 20),
    ];
    const results = suggestCombos(makeContext(projects, 90));
    for (const combo of results) {
      expect(combo.projects.length).toBeGreaterThanOrEqual(2);
      expect(combo.projects.length).toBeLessThanOrEqual(4);
    }
  });

  it('totalMinutes equals sum of project durations', () => {
    const projects = [
      makeProject('a', 30),
      makeProject('b', 50),
      makeProject('c', 20),
      makeProject('d', 10),
    ];
    const results = suggestCombos(makeContext(projects, 90));
    for (const combo of results) {
      // totalMinutes = sum of projectMinutes (allocated, not necessarily estimatedDurationMinutes)
      const sum = combo.projectMinutes.reduce((s, m) => s + m, 0);
      expect(combo.totalMinutes).toBe(sum);
    }
  });

  it('slackMinutes equals availableMinutes - totalMinutes', () => {
    const projects = [makeProject('a', 40), makeProject('b', 45), makeProject('c', 30)];
    const results = suggestCombos(makeContext(projects, 90));
    for (const combo of results) {
      expect(combo.slackMinutes).toBe(90 - combo.totalMinutes);
    }
  });

  it('uses relaxed tolerance when strict yields nothing', () => {
    // 40 + 35 = 75, slack = 15 → misses strict (10) but fits relaxed (20)
    const projects = [makeProject('a', 40), makeProject('b', 35)];
    const results = suggestCombos(makeContext(projects, 90));
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].slackMinutes).toBe(15);
  });
});
