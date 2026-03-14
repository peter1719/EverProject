/**
 * Single-project suggestion algorithm (pure function, no side effects).
 * Scoring: recency 62.5% (14-day window) + frequency 37.5% (30-day / 20-session saturation).
 * Project duration does NOT affect eligibility or score — all projects are always eligible.
 * Exports: suggestProject, scoreAllEligible (shared with combo), getDurationFitScore, getDaysSinceLastSession
 * Dependencies: src/types (Project, Session, SuggestionContext)
 */
import type { Project, Session, SuggestionContext } from '@/types';

// Weights rescaled proportionally (5:3 ratio) after removing duration-fit component.
const RECENCY_WEIGHT = 0.625;
const FREQUENCY_WEIGHT = 0.375;

/** Days until a never-touched project reaches max recency score. */
const RECENCY_WINDOW_DAYS = 14;
/** Sessions in 30 days that fully saturates the frequency penalty. */
const FREQUENCY_SATURATION = 20;
const MS_PER_DAY = 86_400_000;

interface ScoredProject {
  project: Project;
  score: number;
  recencyScore: number;
  frequencyScore: number;
}

/**
 * Scores a single project based solely on usage history (recency + frequency).
 * Project estimated duration does NOT affect eligibility or score.
 */
function scoreProject(
  project: Project,
  sessions: readonly Session[],
  now: number,
): ScoredProject {
  const projectSessions = sessions.filter(s => s.projectId === project.id);

  // ── Recency score (62.5%) ────────────────────────────────────────
  // Higher = project hasn't been touched in a while (neglected = prioritised)
  let recencyScore: number;
  if (projectSessions.length === 0) {
    recencyScore = 1.0; // never done → max recency
  } else {
    const lastSession = projectSessions.reduce(
      (latest, s) => (s.startedAt > latest.startedAt ? s : latest),
    );
    const daysSince = (now - lastSession.startedAt) / MS_PER_DAY;
    // Cap at 1.0 — projects never done or untouched for 14+ days score equally
    recencyScore = Math.min(daysSince / RECENCY_WINDOW_DAYS, 1.0);
  }

  // ── Frequency score (37.5%) ──────────────────────────────────────
  // Higher = project has been worked on less in the last 30 days
  const thirtyDaysAgo = now - 30 * MS_PER_DAY;
  const sessionsLast30 = projectSessions.filter(s => s.startedAt >= thirtyDaysAgo).length;
  const frequencyScore = Math.max(0, 1 - sessionsLast30 / FREQUENCY_SATURATION);

  const score = recencyScore * RECENCY_WEIGHT + frequencyScore * FREQUENCY_WEIGHT;

  return { project, score, recencyScore, frequencyScore };
}

/**
 * Suggests a single project for the user's available time block.
 * Uses weighted scoring: recency (62.5%), frequency (37.5%).
 * Project estimated duration does NOT affect eligibility or score.
 * The `seed` parameter shifts the random pick — increment it for "Roll Again".
 *
 * @returns The suggested Project, or null if no active projects exist
 */
export function suggestProject(context: SuggestionContext): Project | null {
  const { projects, sessions, seed, excludeId } = context;
  const now = Date.now();

  const scored = projects.map(p => scoreProject(p, sessions, now));

  if (scored.length === 0) return null;

  // Remove the previously shown project so Roll Again always yields a different result.
  // Fall back to the full pool only when it would otherwise be empty (single eligible project).
  const pool =
    excludeId && scored.length > 1
      ? scored.filter(s => s.project.id !== excludeId)
      : scored;

  if (pool.length === 1) return pool[0].project;

  // Weighted random pick using cumulative distribution walk
  // Seed shifts the random pick without changing the distribution shape
  const totalWeight = pool.reduce((sum, s) => sum + s.score, 0);

  // Mulberry32 hash: excellent statistical properties for small integer seeds
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const rand = ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  let cursor = rand * totalWeight;

  for (const entry of pool) {
    cursor -= entry.score;
    if (cursor <= 0) return entry.project;
  }

  // Fallback: return the highest-scoring project
  return pool.reduce((best, s) => (s.score > best.score ? s : best)).project;
}

/**
 * Returns all projects scored by usage history.
 * Used by the combo algorithm to share scoring logic.
 */
export function scoreAllEligible(
  projects: readonly Project[],
  sessions: readonly Session[],
): ScoredProject[] {
  const now = Date.now();
  return projects.map(p => scoreProject(p, sessions, now));
}

/**
 * Computes the duration fit score for a given project in a given time window.
 * Used by the SuggestionCard health bar.
 */
export function getDurationFitScore(projectMinutes: number, availableMinutes: number): number {
  if (projectMinutes > availableMinutes) return 0;
  return 1 - (availableMinutes - projectMinutes) / availableMinutes;
}

/**
 * Returns the number of days since the project's last session, or null if never done.
 */
export function getDaysSinceLastSession(
  projectId: string,
  sessions: readonly Session[],
): number | null {
  const projectSessions = sessions.filter(s => s.projectId === projectId);
  if (projectSessions.length === 0) return null;
  const last = projectSessions.reduce((a, b) => (a.startedAt > b.startedAt ? a : b));
  return (Date.now() - last.startedAt) / MS_PER_DAY;
}
