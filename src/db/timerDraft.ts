/**
 * IDB persistence helpers for timer crash recovery.
 * Exports: saveTimerDraft(state) / loadTimerDraft() / clearTimerDraft()
 * useTimer hook calls saveTimerDraft every second; PomodoroTimer calls loadTimerDraft on mount.
 * Dependencies: src/db/index.ts (getDB), src/types (TimerDraft, TimerState)
 */
import { getDB } from '@/db';
import type { TimerDraft, TimerState } from '@/types';

const DRAFT_KEY = 'timer_draft' as const;

export async function saveTimerDraft(state: TimerState): Promise<void> {
  if (state.phase !== 'running' && state.phase !== 'paused') return;
  try {
    const db = await getDB();
    const draft: TimerDraft = {
      key: DRAFT_KEY,
      phase: state.phase,
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
    await db.put('timerDraft', draft);
  } catch (err) {
    console.error('[EverProject] saveTimerDraft failed:', err);
  }
}

export async function loadTimerDraft(): Promise<TimerDraft | undefined> {
  try {
    const db = await getDB();
    return await db.get('timerDraft', DRAFT_KEY);
  } catch (err) {
    console.error('[EverProject] loadTimerDraft failed:', err);
    return undefined;
  }
}

export async function clearTimerDraft(): Promise<void> {
  try {
    const db = await getDB();
    await db.delete('timerDraft', DRAFT_KEY);
  } catch (err) {
    console.error('[EverProject] clearTimerDraft failed:', err);
  }
}
