import { useState, useEffect, useRef } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { useProjectStore } from '@/store/projectStore';
import { PixelDialog } from '@/components/shared/PixelDialog';
import { ColorDot } from '@/components/shared/ColorDot';
import { Button } from '@/components/shared/Button';
import { OutcomeToggle } from '@/components/shared/OutcomeToggle';
import { ProjectNameRow } from '@/components/shared/ProjectNameRow';
import { cn } from '@/lib/utils';
import { MAX_NOTES_LENGTH } from '@/lib/constants';
import type { CompleteRouterState, SessionOutcome } from '@/types';

export function SessionComplete(): React.ReactElement {
  const location = useLocation();
  const state = location.state as CompleteRouterState | null;

  if (!state?.projectIds?.length) {
    return <Navigate to="/library" replace />;
  }

  return <SessionCompleteInner state={state} />;
}

// ── Inner component ───────────────────────────────────────────────────────────

interface SessionCompleteInnerProps {
  readonly state: CompleteRouterState;
}

function SessionCompleteInner({ state }: SessionCompleteInnerProps): React.ReactElement {
  const navigate = useNavigate();

  const {
    actualDurationMs,
    projectIds,
    comboGroupId,
    plannedDurationMinutes,
    outcome: initialOutcome,
    skippedProjectIds,
    projectElapsedMs,
  } = state;

  const addSession = useSessionStore(s => s.addSession);
  const projects = useProjectStore(s => s.projects);

  const [outcome, setOutcome] = useState<SessionOutcome>(
    initialOutcome === 'abandoned' ? 'completed' : initialOutcome,
  );
  const [notes, setNotes] = useState('');
  const [showQuitDialog, setShowQuitDialog] = useState(false);


  const isCombo = projectIds.length > 1;

  const startedProjectIds = projectIds.filter(id => {
    const elapsed = projectElapsedMs[id] ?? 0;
    const wasSkipped = skippedProjectIds.includes(id);
    return elapsed > 0 || (!wasSkipped && id === projectIds[projectIds.length - 1]);
  });

  const lastActiveProjectId =
    startedProjectIds.find(id => !skippedProjectIds.includes(id) && id === startedProjectIds[startedProjectIds.length - 1]) ??
    startedProjectIds[startedProjectIds.length - 1];

  const actualDurationMinutes = Math.round(actualDurationMs / 60000);

  const endedAtRef = useRef(0);
  const startedAtRef = useRef(0);
  useEffect(() => {
    const now = performance.now();
    endedAtRef.current = Date.now();
    startedAtRef.current = endedAtRef.current - actualDurationMs;
    void now;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialOutcome === 'completed') {
      navigator.vibrate?.([100, 50, 100]);
    }
  }, [initialOutcome]);

  async function handleSave(): Promise<void> {
    const startedAt = startedAtRef.current || (endedAtRef.current - actualDurationMs);
    const endedAt = endedAtRef.current || startedAt + actualDurationMs;

    if (!isCombo) {
      const projectId = projectIds[0];
      if (!projectId) return;
      const proj = projects.find(p => p.id === projectId);
      await addSession({
        projectId,
        projectName: proj?.name ?? projectId,
        projectColor: proj?.color ?? 'indigo',
        startedAt,
        endedAt,
        plannedDurationMinutes,
        actualDurationMinutes,
        outcome,
        notes,
        wasCombo: false,
        comboGroupId: null,
      });
    } else {
      const sharedComboId = comboGroupId ?? crypto.randomUUID();
      for (const projectId of startedProjectIds) {
        const wasSkipped = skippedProjectIds.includes(projectId);
        const projectMs = projectElapsedMs[projectId] ?? 0;
        const projectMinutes = Math.round(projectMs / 60000);
        const projectOutcome: SessionOutcome =
          wasSkipped
            ? 'partial'
            : projectId === lastActiveProjectId
              ? outcome
              : 'completed';
        const proj = projects.find(p => p.id === projectId);

        await addSession({
          projectId,
          projectName: proj?.name ?? projectId,
          projectColor: proj?.color ?? 'indigo',
          startedAt,
          endedAt,
          plannedDurationMinutes: proj?.estimatedDurationMinutes ?? plannedDurationMinutes,
          actualDurationMinutes: wasSkipped || projectId !== lastActiveProjectId ? projectMinutes : actualDurationMinutes,
          outcome: projectOutcome,
          notes: projectId === lastActiveProjectId ? notes : '',
          wasCombo: true,
          comboGroupId: sharedComboId,
        });
      }
    }

    navigate('/dashboard');
  }

  function handleQuit(): void {
    setShowQuitDialog(true);
  }

  function handleQuitConfirm(): void {
    navigate('/');
  }

  return (
    <div className="flex flex-col min-h-full bg-surface">
      {/* Completion header */}
      <div className="flex flex-col items-center gap-2 py-8">
        <h1
          className={cn(
            'font-display text-center animate-[complete-enter_300ms_ease-out_forwards]',
            initialOutcome === 'completed'
              ? 'text-success text-2xl font-bold'
              : initialOutcome === 'partial'
                ? 'text-warning text-xl font-semibold'
                : 'text-error text-xl font-semibold',
          )}
        >
          {initialOutcome === 'completed'
            ? '✓ Session complete'
            : initialOutcome === 'partial'
              ? '◷ Session logged'
              : '✕ Abandoned'}
        </h1>
      </div>

      <div className="flex-1 flex flex-col gap-4 px-4 pb-6">
        {/* Session summary card */}
        <div className="bg-surface-variant rounded-xl p-4">
          <p className="text-xs text-on-surface-variant mb-3 font-medium">Session summary</p>

          <div className="flex flex-col gap-3">
            {!isCombo ? (
              (() => {
                const project = projects.find(p => p.id === projectIds[0]);
                return (
                  <>
                    <ProjectNameRow
                      color={project?.color ?? 'indigo'}
                      name={project?.name ?? 'Project'}
                    />
                    <div className="flex justify-between">
                      <span className="text-xs text-on-surface-variant">
                        Planned: {plannedDurationMinutes} min
                      </span>
                      <span className="text-xs text-on-surface-variant">
                        Actual: {actualDurationMinutes} min
                      </span>
                    </div>
                  </>
                );
              })()
            ) : (
              startedProjectIds.map(id => {
                const project = projects.find(p => p.id === id);
                const wasSkipped = skippedProjectIds.includes(id);
                const isLast = id === lastActiveProjectId;
                const projectMs = projectElapsedMs[id] ?? 0;
                const projectMin = Math.round(projectMs / 60000);
                const outcomeIcon = wasSkipped ? '~' : isLast ? '?' : '✓';
                const outcomeClass = wasSkipped ? 'text-warning' : isLast ? 'text-on-surface-variant' : 'text-success';
                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className={cn('text-sm w-4 shrink-0', outcomeClass)}>
                      {outcomeIcon}
                    </span>
                    {project && <ColorDot color={project.color} size={10} />}
                    <span className="flex-1 text-sm text-on-surface truncate">
                      {project?.name ?? 'Project'}
                    </span>
                    <span className="text-xs text-on-surface-variant shrink-0">
                      ~{projectMin} min
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Outcome toggle */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-on-surface-variant">
            {isCombo
              ? `How did ${projects.find(p => p.id === lastActiveProjectId)?.name ?? 'last project'} go?`
              : 'How did it go?'}
          </p>
          <OutcomeToggle value={outcome} onChange={setOutcome} />
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-on-surface-variant">
            Notes (optional)
          </p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))}
            placeholder="Add notes..."
            rows={4}
            className="rounded-xl border border-outline bg-surface-variant text-on-surface p-3 resize-none focus:border-primary focus:outline-none"
          />
          <p className="text-xs text-on-surface-variant text-right">
            {notes.length} / {MAX_NOTES_LENGTH}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button variant="outlined" onClick={handleQuit} className="flex-1">
            ✕ Quit
          </Button>
          <Button variant="filled" onClick={() => void handleSave()} className="flex-1">
            ✓ Save
          </Button>
        </div>
      </div>

      <PixelDialog
        isOpen={showQuitDialog}
        message="Quit without saving? Your session progress will be lost."
        confirmLabel="YES, QUIT"
        cancelLabel="KEEP LOGGING"
        isDanger
        onConfirm={handleQuitConfirm}
        onCancel={() => setShowQuitDialog(false)}
      />
    </div>
  );
}

