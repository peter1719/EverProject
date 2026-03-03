import { useState, useEffect, useCallback } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useTimerStore } from '@/store/timerStore';
import { useProjectStore } from '@/store/projectStore';
import { useTimer } from '@/hooks/useTimer';
import { Square } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { PixelDialog } from '@/components/shared/PixelDialog';
import { ColorDot } from '@/components/shared/ColorDot';
import { Button } from '@/components/shared/Button';
import { COLOR_HEX_MAP } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { TimerRouterState, CompleteRouterState } from '@/types';

export function PomodoroTimer(): React.ReactElement {
  const location = useLocation();
  const routerState = location.state as TimerRouterState | null;

  if (!routerState?.projectIds?.length || !routerState.totalMinutes) {
    return <Navigate to="/library" replace />;
  }

  return <TimerPage routerState={routerState} />;
}

// ── Inner component ───────────────────────────────────────────────────────────

interface TimerPageProps {
  readonly routerState: TimerRouterState;
}

function TimerPage({ routerState }: TimerPageProps): React.ReactElement {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const phase = useTimerStore(s => s.phase);
  const projectIds = useTimerStore(s => s.projectIds);
  const currentProjectIndex = useTimerStore(s => s.currentProjectIndex);
  const remainingSeconds = useTimerStore(s => s.remainingSeconds);
  const startedAt = useTimerStore(s => s.startedAt);
  const skippedProjectIds = useTimerStore(s => s.skippedProjectIds);
  const projectElapsedMs = useTimerStore(s => s.projectElapsedMs);
  const projectAllocatedMinutes = useTimerStore(s => s.projectAllocatedMinutes);

  const { startTimer, pauseTimer, resumeTimer, skipProject, finishTimer, resetTimer } =
    useTimerStore.getState();
  const projects = useProjectStore(s => s.projects);

  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [flashNext, setFlashNext] = useState(false);
  const [flashComplete, setFlashComplete] = useState(false);

  useEffect(() => {
    if (phase === 'idle') {
      startTimer(
        routerState.projectIds,
        routerState.totalMinutes,
        routerState.comboGroupId,
        routerState.projectAllocatedMinutes,
      );
    }
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProjectComplete = useCallback(() => {
    setFlashNext(true);
    navigator.vibrate?.([50, 30, 50]);
    setTimeout(() => setFlashNext(false), 800);
  }, []);

  useEffect(() => {
    if (phase === 'finished') {
      setFlashComplete(true);
      navigator.vibrate?.([100, 50, 100]);
    }
  }, [phase]);

  useTimer(handleProjectComplete);

  const currentProject = projects.find(p => p.id === projectIds[currentProjectIndex]);
  const isCombo = projectIds.length > 1;

  const currentProjectDurationSecs = (() => {
    if (!currentProject) return routerState.totalMinutes * 60;
    if (isCombo) {
      const allocated = projectAllocatedMinutes[currentProject.id];
      return (allocated ?? currentProject.estimatedDurationMinutes) * 60;
    }
    return routerState.totalMinutes * 60;
  })();

  // Smooth progress (no stepping)
  const progress =
    currentProjectDurationSecs > 0
      ? ((currentProjectDurationSecs - remainingSeconds) / currentProjectDurationSecs) * 100
      : 0;

  const colorHex = currentProject ? COLOR_HEX_MAP[currentProject.color] : '#6366F1';

  const mm = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
  const ss = String(remainingSeconds % 60).padStart(2, '0');
  const timeLabel = `${mm}:${ss}`;

  const isSkipEnabled = isCombo && currentProjectIndex < projectIds.length - 1;

  function handlePause(): void {
    pauseTimer();
    navigator.vibrate?.(10);
  }

  function handleResume(): void {
    resumeTimer();
    navigator.vibrate?.(10);
  }

  function handleStopAndLogConfirm(): void {
    setShowStopDialog(false);
    finishTimer();
    const state = useTimerStore.getState();
    const actualDurationMs = startedAt ? Date.now() - startedAt : 0;
    const payload: CompleteRouterState = {
      actualDurationMs,
      projectIds: state.projectIds,
      comboGroupId: state.comboGroupId,
      plannedDurationMinutes: state.plannedDurationMinutes,
      outcome: 'partial',
      skippedProjectIds: state.skippedProjectIds,
      projectElapsedMs: state.projectElapsedMs,
    };
    resetTimer();
    navigate('/complete', { state: payload });
  }

  function handleQuitConfirm(): void {
    resetTimer();
    navigate('/suggest');
  }

  function handleSkipConfirm(): void {
    setShowSkipDialog(false);
    navigator.vibrate?.([50, 30, 50]);

    const nextIndex = currentProjectIndex + 1;
    skipProject();

    // Reset remainingSeconds to the next project's allocated duration.
    // skipProject() only advances currentProjectIndex but leaves remainingSeconds
    // at the old project's value, causing the elapsed display to go negative.
    if (nextIndex < projectIds.length) {
      const nextId = projectIds[nextIndex];
      const nextProject = projects.find(p => p.id === nextId);
      if (nextId && nextProject) {
        const allocated = projectAllocatedMinutes[nextId];
        const nextSecs = (allocated ?? nextProject.estimatedDurationMinutes) * 60;
        useTimerStore.setState(s => ({ ...s, remainingSeconds: nextSecs }));
      }
    }

    setFlashNext(true);
    setTimeout(() => setFlashNext(false), 800);
  }

  const elapsedSecondsForCurrentProject =
    currentProject && projectElapsedMs[currentProject.id]
      ? Math.floor(projectElapsedMs[currentProject.id] / 1000)
      : 0;
  const skipElapsedMin = Math.floor(elapsedSecondsForCurrentProject / 60);
  const skipElapsedSec = elapsedSecondsForCurrentProject % 60;
  const skipTimeLabel = `${skipElapsedMin}:${String(skipElapsedSec).padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-full bg-surface select-none">
      {/* Top bar: Quit */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => setShowQuitDialog(true)}
          className="rounded-lg border border-outline/50 text-sm text-on-surface-variant px-3 py-2 active:opacity-80 transition-opacity duration-100"
          aria-label={t('timer.quit')}
          style={{ minHeight: 44 }}
        >
          {t('timer.quit')}
        </button>

        {/* Phase indicator */}
        <span className="text-sm text-on-surface-variant">
          {phase === 'paused' ? t('timer.paused') : ''}
        </span>
      </div>

      {/* Current project header */}
      <div className="flex flex-col items-center gap-1 px-4 py-2">
        <div className="flex items-center gap-2">
          {currentProject && <ColorDot color={currentProject.color} size={12} />}
          <p className="font-display text-xl font-bold text-on-surface text-center truncate max-w-[240px]">
            {currentProject?.name ?? 'Project'}
          </p>
        </div>
        {/* Elapsed / total */}
        {!flashComplete && !flashNext && (
          <p className="font-mono text-xl font-bold text-on-surface-variant">
            {(() => {
              const elapsed = currentProjectDurationSecs - remainingSeconds;
              const eMM = String(Math.floor(elapsed / 60)).padStart(2, '0');
              const eSS = String(elapsed % 60).padStart(2, '0');
              const tMM = String(Math.floor(currentProjectDurationSecs / 60)).padStart(2, '0');
              const tSS = String(currentProjectDurationSecs % 60).padStart(2, '0');
              return `${eMM}:${eSS} / ${tMM}:${tSS}`;
            })()}
          </p>
        )}
        {isCombo && (
          <p className="font-mono text-sm text-on-surface-variant">
            {t('timer.projectOf', { current: currentProjectIndex + 1, total: projectIds.length })}
          </p>
        )}
      </div>

      {/* Ring */}
      <div className="flex-1 flex items-center justify-center px-8 py-2">
        <div className="relative w-full max-w-[260px] aspect-square">
          {flashComplete && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <p className="animate-[complete-enter_300ms_ease-out_forwards] text-success text-xl font-bold">
                {t('timer.complete')}
              </p>
            </div>
          )}
          {flashNext && !flashComplete && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <p className="text-warning text-base font-semibold">
                {t('timer.next')}
              </p>
            </div>
          )}
          <CircularProgressbar
            value={flashComplete ? 100 : progress}
            text={flashComplete || flashNext ? '' : timeLabel}
            styles={buildStyles({
              strokeLinecap: 'round',
              pathColor: flashComplete ? '#2D6A2D' : colorHex,
              trailColor: '#F4EDE0',
              textColor: '#1A1208',
              textSize: '13px',
              pathTransitionDuration: 1,
            })}
            strokeWidth={10}
          />
        </div>
      </div>

      {/* Combo pills */}
      {isCombo && (
        <div className="flex justify-center gap-2 py-2">
          {projectIds.map((id, i) => {
            const isCompleted = i < currentProjectIndex || skippedProjectIds.includes(id);
            const isCurrent = i === currentProjectIndex;
            const proj = projects.find(p => p.id === id);
            const dotColor = proj ? COLOR_HEX_MAP[proj.color] : '#6366F1';
            return (
              <div
                key={id}
                title={proj?.name ?? ''}
                className={cn(
                  'rounded-full w-3 h-3',
                  isCompleted || isCurrent ? '' : 'bg-outline/20 border border-outline',
                )}
                style={
                  isCompleted || isCurrent
                    ? { backgroundColor: dotColor }
                    : undefined
                }
                aria-label={proj?.name}
              />
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3 px-4 pb-6">
        {/* Primary: Pause / Resume */}
        {phase === 'running' && (
          <Button variant="filled" onClick={handlePause} className="w-full">
            {t('timer.pause')}
          </Button>
        )}

        {phase === 'paused' && (
          <Button variant="filled" onClick={handleResume} className="w-full">
            {t('timer.resume')}
          </Button>
        )}

        {/* Stop & Log — always visible */}
        <Button variant="tonal" onClick={() => setShowStopDialog(true)} className="w-full flex items-center justify-center gap-2">
          <Square size={16} fill="currentColor" />
          {t('timer.stopLog')}
        </Button>

        {/* Skip Project — only shown for combo sessions */}
        {isCombo && (
          <Button
            variant="outlined"
            disabled={!isSkipEnabled}
            onClick={() => setShowSkipDialog(true)}
            className="w-full text-primary"
          >
            {t('timer.skipProject')}
          </Button>
        )}
      </div>

      {/* Quit dialog */}
      <PixelDialog
        isOpen={showQuitDialog}
        message={t('timer.quitMsg')}
        confirmLabel={t('timer.yesQuit')}
        cancelLabel={t('timer.keepGoing')}
        isDanger
        onConfirm={handleQuitConfirm}
        onCancel={() => {
          setShowQuitDialog(false);
          if (phase === 'paused') resumeTimer();
        }}
      />

      {/* Skip dialog */}
      {currentProject && (
        <PixelDialog
          isOpen={showSkipDialog}
          message={t('timer.skipMsg', { name: currentProject.name, time: skipTimeLabel })}
          confirmLabel={t('timer.yesSkip')}
          cancelLabel={t('timer.keepGoing')}
          onConfirm={handleSkipConfirm}
          onCancel={() => setShowSkipDialog(false)}
        />
      )}

      {/* Stop & log confirm dialog */}
      <PixelDialog
        isOpen={showStopDialog}
        message={t('timer.stopLogMsg')}
        confirmLabel={t('timer.stopLogConfirm')}
        cancelLabel={t('timer.keepGoing')}
        onConfirm={handleStopAndLogConfirm}
        onCancel={() => setShowStopDialog(false)}
      />
    </div>
  );
}
