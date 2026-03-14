/**
 * Ephemeral Zustand store for timer state — intentionally NOT persisted (resets on reload).
 * State machine: idle → running/paused → finished
 * Supports single and combo sessions, skipProject, recordProjectElapsed, crash recovery (restoreTimer).
 * useTimer hook drives the rAF loop; timerDraft.ts handles IDB persistence for crash recovery.
 * Dependencies: src/types (TimerDraft, TimerState)
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { TimerDraft, TimerState } from '@/types';

interface TimerActions {
  startTimer(projectIds: string[], totalMinutes: number, comboGroupId?: string, projectAllocatedMinutes?: Record<string, number>): void;
  pauseTimer(): void;
  resumeTimer(): void;
  /** Called every second by the useTimer hook via rAF. */
  tickTimer(): void;
  /** Move to the next project in a combo (called when current project timer naturally reaches 0). */
  advanceCombo(): void;
  /** Skip the current project mid-combo — logs it as 'partial'. */
  skipProject(): void;
  finishTimer(): void;
  resetTimer(): void;
  /** Record elapsed ms for the current project. */
  recordProjectElapsed(projectId: string, elapsedMs: number): void;
  /** Restore timer state from a persisted draft (crash recovery). */
  restoreTimer(draft: TimerDraft): void;
}

const INITIAL_STATE: TimerState = {
  phase: 'idle',
  projectIds: [],
  currentProjectIndex: 0,
  plannedDurationMinutes: 0,
  remainingSeconds: 0,
  startedAt: null,
  comboGroupId: null,
  skippedProjectIds: [],
  projectElapsedMs: {},
  projectAllocatedMinutes: {},
};

export const useTimerStore = create<TimerState & TimerActions>()(
  immer((set, get) => ({
    ...INITIAL_STATE,

    startTimer(projectIds, totalMinutes, comboGroupId, projectAllocatedMinutes) {
      set(state => {
        state.phase = 'running';
        state.projectIds = projectIds;
        state.currentProjectIndex = 0;
        state.plannedDurationMinutes = totalMinutes;
        // For partial combos: first project uses its allocated time (not total)
        const firstId = projectIds[0];
        const firstAllocated = firstId ? (projectAllocatedMinutes?.[firstId] ?? null) : null;
        state.remainingSeconds =
          firstAllocated !== null && projectIds.length > 1
            ? firstAllocated * 60
            : totalMinutes * 60;
        state.startedAt = Date.now();
        state.comboGroupId = comboGroupId ?? null;
        state.skippedProjectIds = [];
        state.projectElapsedMs = {};
        state.projectAllocatedMinutes = projectAllocatedMinutes ?? {};
      });
    },

    pauseTimer() {
      set(state => {
        if (state.phase === 'running') state.phase = 'paused';
      });
    },

    resumeTimer() {
      set(state => {
        if (state.phase === 'paused') state.phase = 'running';
      });
    },

    tickTimer() {
      set(state => {
        if (state.phase !== 'running') return;
        if (state.remainingSeconds > 0) {
          state.remainingSeconds -= 1;
        } else {
          state.phase = 'finished';
        }
      });
    },

    advanceCombo() {
      set(state => {
        const nextIndex = state.currentProjectIndex + 1;
        if (nextIndex < state.projectIds.length) {
          state.currentProjectIndex = nextIndex;
        } else {
          state.phase = 'finished';
        }
      });
    },

    skipProject() {
      const { projectIds, currentProjectIndex } = get();
      const currentId = projectIds[currentProjectIndex];
      if (!currentId) return;

      set(state => {
        state.skippedProjectIds.push(currentId);
        const nextIndex = state.currentProjectIndex + 1;
        if (nextIndex < state.projectIds.length) {
          state.currentProjectIndex = nextIndex;
        } else {
          state.phase = 'finished';
        }
      });
    },

    finishTimer() {
      set(state => {
        state.phase = 'finished';
      });
    },

    resetTimer() {
      set(() => ({ ...INITIAL_STATE }));
    },

    recordProjectElapsed(projectId, elapsedMs) {
      set(state => {
        state.projectElapsedMs[projectId] = (state.projectElapsedMs[projectId] ?? 0) + elapsedMs;
      });
    },

    restoreTimer(draft) {
      set(state => {
        const totalElapsedMs = Object.values(draft.projectElapsedMs).reduce((a, b) => a + b, 0);
        state.phase = draft.phase;
        state.projectIds = draft.projectIds;
        state.currentProjectIndex = draft.currentProjectIndex;
        state.plannedDurationMinutes = draft.plannedDurationMinutes;
        state.remainingSeconds = draft.remainingSeconds;
        state.startedAt = Date.now() - totalElapsedMs;
        state.comboGroupId = draft.comboGroupId;
        state.skippedProjectIds = draft.skippedProjectIds;
        state.projectElapsedMs = draft.projectElapsedMs;
        state.projectAllocatedMinutes = draft.projectAllocatedMinutes;
      });
    },
  })),
);
