import type { Project, Session, SuggestionContext } from '@/types';

const RECENCY_WEIGHT = 0.5;
const FREQUENCY_WEIGHT = 0.3;
const DURATION_FIT_WEIGHT = 0.2;

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
  durationFitScore: number;
}

/**
 * Scores a single project given the session history and available time.
 * Returns null if the project doesn't fit the available time.
 */
function scoreProject(
  project: Project,
  sessions: readonly Session[],
  availableMinutes: number,
  now: number,
): ScoredProject | null {
  // Filter: only projects that fit within the available time
  if (project.estimatedDurationMinutes > availableMinutes) return null;

  const projectSessions = sessions.filter(s => s.projectId === project.id);

  // ── Recency score (50%) ─────────────────────────────────────────
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

  // ── Frequency score (30%) ───────────────────────────────────────
  // Higher = project has been worked on less in the last 30 days
  const thirtyDaysAgo = now - 30 * MS_PER_DAY;
  const sessionsLast30 = projectSessions.filter(s => s.startedAt >= thirtyDaysAgo).length;
  const frequencyScore = Math.max(0, 1 - sessionsLast30 / FREQUENCY_SATURATION);

  // ── Duration fit score (20%) ────────────────────────────────────
  // Higher = project fills the available time more tightly (less slack)
  const slack = availableMinutes - project.estimatedDurationMinutes;
  const durationFitScore = 1 - slack / availableMinutes;

  const score =
    recencyScore * RECENCY_WEIGHT +
    frequencyScore * FREQUENCY_WEIGHT +
    durationFitScore * DURATION_FIT_WEIGHT;

  return { project, score, recencyScore, frequencyScore, durationFitScore };
}

/**
 * Suggests a single project for the user's available time block.
 * Uses weighted scoring: recency (50%), frequency (30%), duration fit (20%).
 * The `seed` parameter shifts the random pick — increment it for "Roll Again".
 *
 * @returns The suggested Project, or null if no project fits the available time
 */
export function suggestProject(context: SuggestionContext): Project | null {
  const { projects, sessions, availableMinutes, seed } = context;
  const now = Date.now();

  const scored = projects
    .map(p => scoreProject(p, sessions, availableMinutes, now))
    .filter((s): s is ScoredProject => s !== null);

  if (scored.length === 0) return null;
  if (scored.length === 1) return scored[0].project;

  // Weighted random pick using cumulative distribution walk
  // Seed shifts the random pick without changing the distribution shape
  const totalWeight = scored.reduce((sum, s) => sum + s.score, 0);

  // Mulberry32 hash: excellent statistical properties for small integer seeds
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const rand = ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  let cursor = rand * totalWeight;

  for (const entry of scored) {
    cursor -= entry.score;
    if (cursor <= 0) return entry.project;
  }

  // Fallback: return the highest-scoring project
  return scored.reduce((best, s) => (s.score > best.score ? s : best)).project;
}

/**
 * Returns all projects eligible for the given available time, scored.
 * Used by the combo algorithm to share scoring logic.
 */
export function scoreAllEligible(
  projects: readonly Project[],
  sessions: readonly Session[],
  availableMinutes: number,
): ScoredProject[] {
  const now = Date.now();
  return projects
    .map(p => scoreProject(p, sessions, availableMinutes, now))
    .filter((s): s is ScoredProject => s !== null);
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
