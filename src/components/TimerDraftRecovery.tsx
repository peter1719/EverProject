import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTimerStore } from '@/store/timerStore';
import { loadTimerDraft, clearTimerDraft } from '@/db/timerDraft';
import { useTranslation } from '@/hooks/useTranslation';
import { useProjectStore } from '@/store/projectStore';
import type { TimerDraft, TimerRouterState } from '@/types';

export function TimerDraftRecovery(): React.ReactElement | null {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const projects = useProjectStore(s => s.projects);
  const timerPhase = useTimerStore(s => s.phase);
  const restoreTimer = useTimerStore(s => s.restoreTimer);

  const [draft, setDraft] = useState<TimerDraft | null>(null);

  useEffect(() => {
    if (timerPhase !== 'idle') return;
    void loadTimerDraft().then(d => {
      if (d) setDraft(d);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!draft) return null;
  if (timerPhase !== 'idle') return null;
  // Don't show recovery sheet on the timer page itself — PomodoroTimer handles
  // draft restoration directly, avoiding a competing UI flash.
  if (location.pathname === '/timer') return null;

  const remainingMinutes = Math.ceil(draft.remainingSeconds / 60);

  // Build project name(s) label
  const projectNames = draft.projectIds
    .map(id => projects.find(p => p.id === id)?.name ?? id)
    .join(', ');

  function handleContinue(): void {
    if (!draft) return;
    restoreTimer(draft);
    const routerState: TimerRouterState = {
      projectIds: draft.projectIds,
      totalMinutes: draft.plannedDurationMinutes,
      comboGroupId: draft.comboGroupId ?? undefined,
      projectAllocatedMinutes: draft.projectAllocatedMinutes,
    };
    navigate('/timer', { state: routerState });
    setDraft(null);
  }

  function handleDiscard(): void {
    void clearTimerDraft();
    setDraft(null);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('timer.draftTitle')}
      className="fixed inset-0 z-50 flex items-end justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleDiscard}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-surface-variant px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-6 shadow-xl">
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-outline/40" />

        <h2 className="text-title-large font-medium text-on-surface">
          {t('timer.draftTitle')}
        </h2>

        {projectNames && (
          <p className="mt-1 text-body-medium text-on-surface-variant line-clamp-1">
            {projectNames}
          </p>
        )}

        <p className="mt-1 text-body-medium text-on-surface-variant">
          {t('timer.draftSub', { min: remainingMinutes })}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleContinue}
            className="h-12 w-full rounded-xl bg-primary px-6 text-label-large font-medium text-on-primary active:opacity-80 transition-opacity duration-100"
          >
            {t('timer.draftContinue')}
          </button>
          <button
            onClick={handleDiscard}
            className="h-12 w-full rounded-xl border border-outline bg-transparent px-6 text-label-large font-medium text-primary active:opacity-80 transition-opacity duration-100"
          >
            {t('timer.draftDiscard')}
          </button>
        </div>
      </div>
    </div>
  );
}
