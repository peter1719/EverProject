# Algorithms

Pure functions with no side effects. Source code in `src/algorithms/`.

---

## Single Suggestion (`suggestion.ts`)

### `suggestProject(context: SuggestionContext): Project | null`

Picks one project from the active pool using weighted random selection.

**Scoring formula:**
```
score = recencyScore × 0.625 + frequencyScore × 0.375
```

**Recency Score (62.5%)** — higher means the project hasn't been touched in a while (neglected = prioritized)
```
Never worked on:   recencyScore = 1.0
Otherwise:         recencyScore = min(daysSinceLastSession / 14, 1.0)
```
→ 14+ days without a session scores the maximum 1.0

**Frequency Score (37.5%)** — higher means fewer sessions in the last 30 days
```
sessionsLast30 = number of sessions in the past 30 days
frequencyScore = max(0, 1 - sessionsLast30 / 20)
```
→ 20+ sessions in 30 days scores 0

**Important:** `estimatedDurationMinutes` does **not** affect eligibility or score — any project can be suggested regardless of duration.

**Random selection:** Weighted cumulative-distribution walk (Mulberry32 hash shifted by seed)
```typescript
// seed increments on each Roll Again → same distribution, different result
// excludeId removes the previously shown project from the pool (when pool size > 1)
```

**Exported functions:**
```typescript
suggestProject(context: SuggestionContext): Project | null
scoreAllEligible(projects, sessions): ScoredProject[]  // shared with combo algorithm
getDurationFitScore(projectMinutes, availableMinutes): number  // SuggestionCard health bar
getDaysSinceLastSession(projectId, sessions): number | null
```

---

## Combo Suggestion (`combo.ts`)

### `suggestCombos(context: SuggestionContext): ComboSuggestion[]`

Generates up to 3 multi-project combo sets from active projects.

**Steps:**

1. **Score**: call `scoreAllEligible()` on all projects; take the top 8 by score
2. **Generate combinations**: C(8,2) + C(8,3) + C(8,4) = all 2–4 project sets
3. **Partial combo**: if a project's duration exceeds the remaining available time, truncate it to fill the gap
4. **Filter**: `available - 10 ≤ totalMinutes ≤ available` (±10 min tolerance)
5. **If no results**: relax tolerance to ±20 min and retry
6. **Score and rank**: `avgProjectScore × (1 - slackMinutes / availableMinutes)`
7. **Return**: top 3 sets

**Partial Combo explained:**
- When a project's `estimatedDurationMinutes` exceeds the remaining available time, it is truncated to fill exactly that remaining time
- `projectMinutes` array stores the actual allocated minutes per project
- `slackMinutes = 0` for partial combos (all time is used)
- The timer page uses `projectAllocatedMinutes` to override the countdown per project

**Return type:**
```typescript
interface ComboSuggestion {
  projects: Project[];
  projectMinutes: number[];   // actual allocated minutes per project
  totalMinutes: number;
  slackMinutes: number;       // 0 for partial combos
  score: number;
}
```

---

## Shared Utilities

```typescript
// Exported from suggestion.ts, used by combo.ts
scoreAllEligible(projects, sessions): ScoredProject[]

// Used by SuggestionCard health bar
getDurationFitScore(projectMinutes, availableMinutes): number
// → 0 = not enough time; 1 = perfect fit; values in between = slack present
```
