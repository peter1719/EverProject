import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTimerStore } from '@/store/timerStore';
import { useProjectStore } from '@/store/projectStore';
import type { CompleteRouterState } from '@/types';

/**
 * Drives the timer loop via requestAnimationFrame.
 * Handles Page Visibility reconciliation and Wake Lock.
 * Mount only once inside PomodoroTimer.
 */
export function useTimer(onProjectComplete?: () => void): void {
  const navigate = useNavigate();
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const backgroundedAtRef = useRef<number | null>(null);
  const navigatingRef = useRef(false);

  const phase = useTimerStore(s => s.phase);
  const projects = useProjectStore(s => s.projects);

  // ── Wake Lock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'running') {
      void (async () => {
        try {
          if ('wakeLock' in navigator) {
            wakeLockRef.current = await navigator.wakeLock.request('screen');
          }
        } catch {
          // Device may not support it
        }
      })();
    } else {
      void wakeLockRef.current?.release().catch(() => null);
      wakeLockRef.current = null;
    }
  }, [phase]);

  // ── rAF loop ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'running') {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    lastTickRef.current = Date.now();

    function loop(): void {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;

      if (elapsed >= 1000) {
        lastTickRef.current = now - (elapsed % 1000);

        const {
          phase: currentPhase,
          projectIds,
          currentProjectIndex,
          remainingSeconds,
        } = useTimerStore.getState();

        if (currentPhase !== 'running') return;

        const currentId = projectIds[currentProjectIndex];
        if (currentId) {
          useTimerStore.getState().recordProjectElapsed(currentId, 1000);
        }

        if (remainingSeconds <= 1) {
          // This tick would reach 0 — handle combo vs single
          const isCombo = projectIds.length > 1;
          if (isCombo && currentProjectIndex < projectIds.length - 1) {
            // Advance to next project
            useTimerStore.getState().tickTimer(); // sets remainingSeconds = 0
            useTimerStore.getState().advanceCombo(); // moves to next project
            // Reset remaining to next project's full duration
            const nextId = projectIds[currentProjectIndex + 1];
            const nextProject = projects.find(p => p.id === nextId);
            if (nextProject && nextId) {
              const { projectAllocatedMinutes } = useTimerStore.getState();
              const nextSecs =
                (projectAllocatedMinutes[nextId] ?? nextProject.estimatedDurationMinutes) * 60;
              useTimerStore.setState(state => ({
                ...state,
                remainingSeconds: nextSecs,
                phase: 'running',
              }));
            }
            onProjectComplete?.();
          } else {
            useTimerStore.getState().tickTimer();
          }
        } else {
          useTimerStore.getState().tickTimer();
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [phase, projects, onProjectComplete]);

  // ── Navigate on finish ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'finished' || navigatingRef.current) return;
    navigatingRef.current = true;

    const state = useTimerStore.getState();
    const actualDurationMs = state.startedAt ? Date.now() - state.startedAt : 0;

    const payload: CompleteRouterState = {
      actualDurationMs,
      projectIds: state.projectIds,
      comboGroupId: state.comboGroupId,
      plannedDurationMinutes: state.plannedDurationMinutes,
      outcome: 'completed',
      skippedProjectIds: state.skippedProjectIds,
      projectElapsedMs: state.projectElapsedMs,
    };

    navigate('/complete', { state: payload });
  }, [phase, navigate]);

  // ── Page Visibility reconciliation ─────────────────────────────────────────
  useEffect(() => {
    function onVisibilityChange(): void {
      if (document.hidden) {
        backgroundedAtRef.current = Date.now();
      } else {
        if (backgroundedAtRef.current === null) return;
        const backgroundElapsed = Date.now() - backgroundedAtRef.current;
        backgroundedAtRef.current = null;

        const state = useTimerStore.getState();
        if (state.phase !== 'running') return;

        const { projectIds } = state;
        const isCombo = projectIds.length > 1;

        if (!isCombo) {
          const elapsedSecs = Math.floor(backgroundElapsed / 1000);
          const currentId = projectIds[state.currentProjectIndex];
          if (currentId) {
            useTimerStore.getState().recordProjectElapsed(currentId, Math.min(backgroundElapsed, state.remainingSeconds * 1000));
          }
          const newRemaining = state.remainingSeconds - elapsedSecs;
          if (newRemaining <= 0) {
            useTimerStore.setState(s => ({ ...s, remainingSeconds: 0, phase: 'finished' }));
          } else {
            useTimerStore.setState(s => ({ ...s, remainingSeconds: newRemaining }));
          }
        } else {
          // Walk through projects
          let remainingElapsedMs = backgroundElapsed;
          let currentState = useTimerStore.getState();

          while (remainingElapsedMs > 0) {
            const projectMs = currentState.remainingSeconds * 1000;
            const currentId = currentState.projectIds[currentState.currentProjectIndex];

            if (remainingElapsedMs >= projectMs) {
              if (currentId) {
                useTimerStore.getState().recordProjectElapsed(currentId, projectMs);
              }
              remainingElapsedMs -= projectMs;

              const nextIndex = currentState.currentProjectIndex + 1;
              if (nextIndex < currentState.projectIds.length) {
                const nextId = currentState.projectIds[nextIndex];
                const nextProject = projects.find(p => p.id === nextId);
                const nextAllocated = nextId ? currentState.projectAllocatedMinutes[nextId] : undefined;
                const nextSecs = nextProject
                  ? (nextAllocated ?? nextProject.estimatedDurationMinutes) * 60
                  : 0;
                useTimerStore.setState(s => ({
                  ...s,
                  currentProjectIndex: nextIndex,
                  remainingSeconds: nextSecs,
                }));
                currentState = useTimerStore.getState();
              } else {
                useTimerStore.setState(s => ({ ...s, remainingSeconds: 0, phase: 'finished' }));
                return;
              }
            } else {
              if (currentId) {
                useTimerStore.getState().recordProjectElapsed(currentId, remainingElapsedMs);
              }
              const elapsedSecs = Math.floor(remainingElapsedMs / 1000);
              useTimerStore.setState(s => ({
                ...s,
                remainingSeconds: Math.max(0, s.remainingSeconds - elapsedSecs),
              }));
              break;
            }
          }
        }

        // Reset rAF last tick to now to avoid a huge jump tick
        lastTickRef.current = Date.now();
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [projects]);

  // Reset navigate guard when a new timer starts
  useEffect(() => {
    if (phase === 'running') navigatingRef.current = false;
  }, [phase]);
}
