import { useState, useEffect, useRef } from 'react';
import { useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/store/sessionStore';
import { useProjectStore } from '@/store/projectStore';
import { useTranslation } from '@/hooks/useTranslation';
import { PixelDialog } from '@/components/shared/PixelDialog';
import { ColorDot } from '@/components/shared/ColorDot';
import { Button } from '@/components/shared/Button';
import { OutcomeToggle } from '@/components/shared/OutcomeToggle';
import { ProjectNameRow } from '@/components/shared/ProjectNameRow';
import { cn } from '@/lib/utils';
import { MAX_NOTES_LENGTH } from '@/lib/constants';
import { compressImage } from '@/lib/imageUtils';
import type { CompleteRouterState, SessionOutcome } from '@/types';

function CameraButton({ onClick }: { readonly onClick: () => void }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-8 h-8 shrink-0 rounded-lg bg-surface-variant border border-outline flex items-center justify-center text-on-surface-variant active:opacity-80 transition-opacity duration-100"
      aria-label="Add photo"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </button>
  );
}

function ImageThumbnail({
  src,
  onRemove,
}: { readonly src: string | undefined; readonly onRemove: () => void }): React.ReactElement | null {
  if (!src) return null;
  return (
    <div className="relative rounded-xl overflow-hidden" style={{ width: 140, aspectRatio: '4/3' }}>
      <img src={src} alt="Preview" className="w-full h-full object-cover object-center" />
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center text-white text-sm"
      >
        ✕
      </button>
    </div>
  );
}

export function LandscapeComplete(): React.ReactElement {
  const location = useLocation();
  const state = location.state as CompleteRouterState | null;
  if (!state?.projectIds?.length) return <Navigate to="/library" replace />;
  return <LandscapeCompleteInner state={state} />;
}

function LandscapeCompleteInner({ state }: { readonly state: CompleteRouterState }): React.ReactElement {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { actualDurationMs, projectIds, comboGroupId, plannedDurationMinutes, outcome: initialOutcome, skippedProjectIds, projectElapsedMs } = state;

  const addSession = useSessionStore(s => s.addSession);
  const putSessionImage = useSessionStore(s => s.putSessionImage);
  const projects = useProjectStore(s => s.projects);

  const [outcome, setOutcome] = useState<SessionOutcome>(
    initialOutcome === 'abandoned' ? 'completed' : initialOutcome,
  );
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [imagesMap, setImagesMap] = useState<Record<string, string>>({});
  const [showQuitDialog, setShowQuitDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadForIdRef = useRef<string>('');

  const endedAtRef = useRef(0);
  const startedAtRef = useRef(0);
  useEffect(() => {
    endedAtRef.current = Date.now();
    startedAtRef.current = endedAtRef.current - actualDurationMs;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (initialOutcome === 'completed') navigator.vibrate?.([100, 50, 100]);
  }, [initialOutcome]);

  function setProjectNotes(id: string, value: string): void {
    setNotesMap(prev => ({ ...prev, [id]: value.slice(0, MAX_NOTES_LENGTH) }));
  }

  function triggerImagePick(projectId: string): void {
    uploadForIdRef.current = projectId;
    fileInputRef.current?.click();
  }

  async function handleImagePick(e: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;
    const id = uploadForIdRef.current;
    if (!id) return;
    try {
      setImagesMap(prev => ({ ...prev, [id]: '' }));
      const compressed = await compressImage(file);
      setImagesMap(prev => ({ ...prev, [id]: compressed }));
    } catch { /* ignore */ }
    e.target.value = '';
  }

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

  async function handleSave(): Promise<void> {
    const startedAt = startedAtRef.current || (endedAtRef.current - actualDurationMs);
    const endedAt = endedAtRef.current || startedAt + actualDurationMs;

    if (!isCombo) {
      const projectId = projectIds[0];
      if (!projectId) return;
      const proj = projects.find(p => p.id === projectId);
      const img = imagesMap[projectId];
      const sessionId = await addSession({
        projectId, projectName: proj?.name ?? projectId, projectColor: proj?.color ?? 'indigo',
        startedAt, endedAt, plannedDurationMinutes, actualDurationMinutes, outcome,
        notes: notesMap[projectId] ?? '', hasImage: !!img, wasCombo: false, comboGroupId: null,
      });
      if (img) await putSessionImage(sessionId, img);
    } else {
      const sharedComboId = comboGroupId ?? crypto.randomUUID();
      for (const projectId of startedProjectIds) {
        const wasSkipped = skippedProjectIds.includes(projectId);
        const projectMs = projectElapsedMs[projectId] ?? 0;
        const projectMinutes = Math.round(projectMs / 60000);
        const projectOutcome: SessionOutcome =
          wasSkipped ? 'partial' : projectId === lastActiveProjectId ? outcome : 'completed';
        const proj = projects.find(p => p.id === projectId);
        const isLastActive = projectId === lastActiveProjectId;
        const img = imagesMap[projectId];
        const sessionId = await addSession({
          projectId, projectName: proj?.name ?? projectId, projectColor: proj?.color ?? 'indigo',
          startedAt, endedAt, plannedDurationMinutes: proj?.estimatedDurationMinutes ?? plannedDurationMinutes,
          actualDurationMinutes: wasSkipped || !isLastActive ? projectMinutes : actualDurationMinutes,
          outcome: projectOutcome, notes: notesMap[projectId] ?? '', hasImage: !!img,
          wasCombo: true, comboGroupId: sharedComboId,
        });
        if (img) await putSessionImage(sessionId, img);
      }
    }
    navigate('/dashboard');
  }

  return (
    <div className="flex h-full overflow-hidden bg-surface">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => void handleImagePick(e)} />

      {/* ── Left: header + summary + outcome ────────────────────────── */}
      <div className="flex w-[45%] flex-col overflow-y-auto border-r border-outline/20 px-6 py-6">
        {/* Completion status */}
        <h1
          className={cn(
            'font-display text-center mb-6 animate-[complete-enter_300ms_ease-out_forwards]',
            initialOutcome === 'completed' ? 'text-success text-2xl font-bold'
              : initialOutcome === 'partial' ? 'text-warning text-xl font-semibold'
              : 'text-error text-xl font-semibold',
          )}
        >
          {initialOutcome === 'completed' ? t('complete.completed')
            : initialOutcome === 'partial' ? t('complete.partial')
            : t('complete.abandoned')}
        </h1>

        {/* Session summary */}
        <div className="bg-surface-variant rounded-xl p-4 mb-5">
          <p className="text-xs text-on-surface-variant mb-3 font-medium">{t('complete.summary')}</p>
          <div className="flex flex-col gap-3">
            {!isCombo ? (
              (() => {
                const project = projects.find(p => p.id === projectIds[0]);
                return (
                  <>
                    <ProjectNameRow color={project?.color ?? 'indigo'} name={project?.name ?? 'Project'} />
                    <div className="flex justify-between">
                      <span className="text-xs text-on-surface-variant">{t('complete.planned', { minutes: plannedDurationMinutes })}</span>
                      <span className="text-xs text-on-surface-variant">{t('complete.actual', { minutes: actualDurationMinutes })}</span>
                    </div>
                  </>
                );
              })()
            ) : (
              startedProjectIds.map(id => {
                const project = projects.find(p => p.id === id);
                const wasSkipped = skippedProjectIds.includes(id);
                const isLast = id === lastActiveProjectId;
                const projectMin = Math.round((projectElapsedMs[id] ?? 0) / 60000);
                const outcomeIcon = wasSkipped ? '~' : isLast ? '?' : '✓';
                const outcomeClass = wasSkipped ? 'text-warning' : isLast ? 'text-on-surface-variant' : 'text-success';
                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className={cn('text-sm w-4 shrink-0', outcomeClass)}>{outcomeIcon}</span>
                    {project && <ColorDot color={project.color} size={10} />}
                    <span className="flex-1 text-sm text-on-surface truncate">{project?.name ?? 'Project'}</span>
                    <span className="text-xs text-on-surface-variant shrink-0">~{projectMin} min</span>
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
              ? t('complete.howLastGo', { name: projects.find(p => p.id === lastActiveProjectId)?.name ?? '' })
              : t('complete.howGo')}
          </p>
          <OutcomeToggle value={outcome} onChange={setOutcome} />
        </div>
      </div>

      {/* ── Right: notes + actions ───────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-6 gap-4">
        {/* Notes label */}
        <p className="text-sm font-medium text-on-surface-variant">{t('complete.notes')}</p>

        {!isCombo ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">{projectIds[0] ? (projects.find(p => p.id === projectIds[0])?.name ?? '') : ''}</span>
              <CameraButton onClick={() => triggerImagePick(projectIds[0])} />
            </div>
            <textarea
              value={notesMap[projectIds[0]] ?? ''}
              onChange={e => setProjectNotes(projectIds[0], e.target.value)}
              placeholder={t('complete.addNotes')}
              rows={5}
              className="rounded-xl border border-outline bg-surface-variant text-on-surface p-3 resize-none focus:border-primary focus:outline-none"
            />
            <ImageThumbnail
              src={imagesMap[projectIds[0]]}
              onRemove={() => setImagesMap(prev => { const n = { ...prev }; delete n[projectIds[0]]; return n; })}
            />
            <p className="text-xs text-on-surface-variant text-right">{(notesMap[projectIds[0]] ?? '').length} / {MAX_NOTES_LENGTH}</p>
          </>
        ) : (
          startedProjectIds.map(id => {
            const project = projects.find(p => p.id === id);
            const val = notesMap[id] ?? '';
            return (
              <div key={id} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  {project && <ColorDot color={project.color} size={8} />}
                  <span className="flex-1 text-xs text-on-surface-variant font-medium truncate">{project?.name ?? 'Project'}</span>
                  <CameraButton onClick={() => triggerImagePick(id)} />
                </div>
                <textarea
                  value={val}
                  onChange={e => setProjectNotes(id, e.target.value)}
                  placeholder={t('complete.addNotes')}
                  rows={3}
                  className="rounded-xl border border-outline bg-surface-variant text-on-surface p-3 resize-none focus:border-primary focus:outline-none"
                />
                <ImageThumbnail
                  src={imagesMap[id]}
                  onRemove={() => setImagesMap(prev => { const n = { ...prev }; delete n[id]; return n; })}
                />
                <p className="text-xs text-on-surface-variant text-right">{val.length} / {MAX_NOTES_LENGTH}</p>
              </div>
            );
          })
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-auto pt-2">
          <Button variant="outlined" onClick={() => setShowQuitDialog(true)} className="flex-1">{t('btn.quit')}</Button>
          <Button variant="filled" onClick={() => void handleSave()} className="flex-1">{t('btn.save')}</Button>
        </div>
      </div>

      <PixelDialog
        isOpen={showQuitDialog}
        message={t('complete.quitMsg')}
        confirmLabel={t('complete.yesQuit')}
        cancelLabel={t('complete.keepLogging')}
        isDanger
        onConfirm={() => navigate('/')}
        onCancel={() => setShowQuitDialog(false)}
        className="max-w-sm mx-auto"
      />
    </div>
  );
}
