import { scoreAllEligible } from './suggestion';
import type { ComboSuggestion, SuggestionContext, Project } from '@/types';

const TOP_N_PROJECTS = 8;
const DEFAULT_SLACK_TOLERANCE = 10; // min below availableMinutes
const RELAXED_SLACK_TOLERANCE = 20; // fallback tolerance
const MIN_PARTIAL_MINUTES = 5; // minimum useful partial allocation

/**
 * Generates all combinations of `size` items from `arr`.
 */
function combinations<T>(arr: T[], size: number): T[][] {
  if (size === 0) return [[]];
  if (arr.length < size) return [];

  const [first, ...rest] = arr;
  const withFirst = combinations(rest, size - 1).map(combo => [first, ...combo]);
  const withoutFirst = combinations(rest, size);
  return [...withFirst, ...withoutFirst];
}

/**
 * Scores a combo of projects.
 * Formula: avgProjectScore × (1 - slack / availableMinutes)
 */
function scoreCombo(
  projects: Array<{ project: Project; score: number }>,
  availableMinutes: number,
): { totalMinutes: number; slackMinutes: number; score: number } {
  const totalMinutes = projects.reduce((sum, p) => sum + p.project.estimatedDurationMinutes, 0);
  const slackMinutes = availableMinutes - totalMinutes;
  const avgProjectScore = projects.reduce((sum, p) => sum + p.score, 0) / projects.length;
  const score = avgProjectScore * (1 - slackMinutes / availableMinutes);
  return { totalMinutes, slackMinutes, score };
}

/**
 * Builds combo suggestions for a given slack tolerance.
 */
function buildCombos(
  topProjects: Array<{ project: Project; score: number }>,
  availableMinutes: number,
  slackTolerance: number,
): ComboSuggestion[] {
  const results: ComboSuggestion[] = [];

  // Generate C(n,2) + C(n,3) + C(n,4) combos
  for (const size of [2, 3, 4]) {
    const combos = combinations(topProjects, size);

    for (const combo of combos) {
      const totalMinutes = combo.reduce(
        (sum, p) => sum + p.project.estimatedDurationMinutes,
        0,
      );
      const slack = availableMinutes - totalMinutes;

      // Filter: combo must fit within tolerance
      if (slack < 0 || slack > slackTolerance) continue;

      const { slackMinutes, score } = scoreCombo(combo, availableMinutes);
      results.push({
        projects: combo.map(p => p.project),
        projectMinutes: combo.map(p => p.project.estimatedDurationMinutes),
        totalMinutes,
        slackMinutes,
        score,
      });
    }
  }

  return results;
}

/**
 * Generates combos where 1–3 full projects are followed by one partial project
 * that fills the remaining slack.  The partial project runs for fewer minutes
 * than its estimatedDurationMinutes.
 */
function buildPartialCombos(
  topProjects: Array<{ project: Project; score: number }>,
  availableMinutes: number,
): ComboSuggestion[] {
  const results: ComboSuggestion[] = [];

  // Try 1, 2, or 3 full projects followed by 1 partial
  for (const fullSize of [1, 2, 3]) {
    const fullCombos = combinations(topProjects, fullSize);

    for (const fullCombo of fullCombos) {
      const fullTotal = fullCombo.reduce(
        (sum, p) => sum + p.project.estimatedDurationMinutes,
        0,
      );
      const slack = availableMinutes - fullTotal;

      if (slack < MIN_PARTIAL_MINUTES) continue;

      const usedIds = new Set(fullCombo.map(p => p.project.id));

      for (const candidate of topProjects) {
        if (usedIds.has(candidate.project.id)) continue;
        // Only partial if candidate's full duration exceeds the slack
        if (candidate.project.estimatedDurationMinutes <= slack) continue;

        const allProjects = [...fullCombo, candidate];
        const avgScore =
          allProjects.reduce((sum, p) => sum + p.score, 0) / allProjects.length;
        // Slight penalty vs a full-fit combo since partial is less satisfying
        const score = avgScore * 0.9;

        results.push({
          projects: allProjects.map(p => p.project),
          projectMinutes: [
            ...fullCombo.map(p => p.project.estimatedDurationMinutes),
            slack,
          ],
          totalMinutes: availableMinutes,
          slackMinutes: 0,
          score,
        });
      }
    }
  }

  return results;
}

/**
 * Suggests up to 3 multi-project combos for the user's available time block.
 *
 * Algorithm:
 * 1. Score all eligible projects (same scoring as suggestProject); take top 8
 * 2. Generate all C(8,2) + C(8,3) + C(8,4) combinations (max 154)
 * 3. Filter: availableMinutes - 10 ≤ totalDuration ≤ availableMinutes
 * 4. Score each combo: avgProjectScore × (1 - slack / availableMinutes)
 * 5. Return top 3; relax tolerance to 20 min if step 3 yields nothing
 *
 * @returns Up to 3 ComboSuggestion objects, sorted by score descending
 */
export function suggestCombos(context: SuggestionContext): ComboSuggestion[] {
  const { projects, sessions, availableMinutes } = context;

  // Score ALL projects; buildCombos / buildPartialCombos handle time-fitting.
  const scored = scoreAllEligible(projects, sessions)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N_PROJECTS)
    .map(s => ({ project: s.project, score: s.score }));

  if (scored.length < 2) return [];

  // Try strict tolerance first, then relax if nothing found
  let fullCombos = buildCombos(scored, availableMinutes, DEFAULT_SLACK_TOLERANCE);

  if (fullCombos.length === 0) {
    fullCombos = buildCombos(scored, availableMinutes, RELAXED_SLACK_TOLERANCE);
  }

  // Merge partial combos and sort by score, return top 3
  const allCombos = [...fullCombos, ...buildPartialCombos(scored, availableMinutes)];
  return allCombos
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
