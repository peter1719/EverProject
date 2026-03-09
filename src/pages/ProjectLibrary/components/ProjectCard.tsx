import { useState, useReducer, useRef, useEffect } from 'react';
import { ProjectProgressBar } from '@/components/shared/ProjectProgressBar';
import { cn } from '@/lib/utils';
import { PixelDialog } from '@/components/shared/PixelDialog';
import { ProjectDetailSheet } from '@/components/shared';
import { COLOR_HEX_MAP } from '@/lib/constants';
import type { Project } from '@/types';

interface ProjectCardProps {
  readonly project: Project;
  readonly reorderMode?: boolean;
  readonly totalMinutes?: number;
  readonly onStart: (project: Project) => void;
  readonly onEdit: (project: Project) => void;
  readonly onArchive: (id: string) => void;
  readonly onUnarchive: (id: string) => void;
  readonly onDelete: (id: string) => void;
  /** When provided, overrides the default click-to-open-detail-sheet behaviour. */
  readonly onCardClick?: (project: Project) => void;
}

// ── Swipe constants ────────────────────────────────────────────────────────────
const REVEAL_WIDTH = 72;
const DRAG_THRESHOLD = 8;
const SNAP_THRESHOLD = 30;

// offset 語意：0 = 中立，+REVEAL_WIDTH = 右滑(archive)，-REVEAL_WIDTH = 左滑(delete)
type RevealedSide = 'archive' | 'delete' | null;
type SwipeState = { offset: number; revealedSide: RevealedSide; isDragging: boolean };
const SWIPE_INITIAL: SwipeState = { offset: 0, revealedSide: null, isDragging: false };

type SwipeAction =
  | { type: 'DRAG_START' }
  | { type: 'DRAG_MOVE'; offset: number }
  | { type: 'DRAG_CANCEL_VERTICAL'; offset: number }
  | { type: 'SNAP_OPEN_ARCHIVE' }
  | { type: 'SNAP_OPEN_DELETE' }
  | { type: 'SNAP_CLOSE' }
  | { type: 'KEEP_CURRENT'; revealedSide: RevealedSide }
  | { type: 'CLOSE_REVEAL' };

function swipeReducer(state: SwipeState, action: SwipeAction): SwipeState {
  switch (action.type) {
    case 'DRAG_START':           return { ...state, isDragging: true };
    case 'DRAG_MOVE':            return { ...state, offset: action.offset };
    case 'DRAG_CANCEL_VERTICAL': return { ...state, isDragging: false, offset: action.offset };
    case 'SNAP_OPEN_ARCHIVE':    return { ...state, isDragging: false, offset: REVEAL_WIDTH,  revealedSide: 'archive' };
    case 'SNAP_OPEN_DELETE':     return { ...state, isDragging: false, offset: -REVEAL_WIDTH, revealedSide: 'delete' };
    case 'SNAP_CLOSE':           return { ...state, isDragging: false, offset: 0, revealedSide: null };
    case 'KEEP_CURRENT': {
      const snap = action.revealedSide === 'archive' ? REVEAL_WIDTH
                 : action.revealedSide === 'delete'  ? -REVEAL_WIDTH
                 : 0;
      return { ...state, isDragging: false, offset: snap };
    }
    case 'CLOSE_REVEAL': return { ...state, offset: 0, revealedSide: null };
  }
}

export function ProjectCard({
  project,
  reorderMode = false,
  totalMinutes = 0,
  onStart,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  onCardClick,
}: ProjectCardProps): React.ReactElement {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);
  const [swipe, dispatchSwipe] = useReducer(swipeReducer, SWIPE_INITIAL);
  const { offset, revealedSide, isDragging } = swipe;
  const revealed = revealedSide !== null;

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const baseOffsetRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const colorHex = COLOR_HEX_MAP[project.color];

  // Close swipe reveal when tapping outside this card
  useEffect(() => {
    if (!revealed) return;
    function onDocPointerDown(e: PointerEvent): void {
      if (!containerRef.current?.contains(e.target as Node)) {
        dispatchSwipe({ type: 'CLOSE_REVEAL' });
      }
    }
    document.addEventListener('pointerdown', onDocPointerDown);
    return () => document.removeEventListener('pointerdown', onDocPointerDown);
  }, [revealed]);

  function handleConfirmDelete(): void {
    setDeleteDialogOpen(false);
    onDelete(project.id);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>): void {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    baseOffsetRef.current =
      revealedSide === 'archive' ? REVEAL_WIDTH :
      revealedSide === 'delete'  ? -REVEAL_WIDTH :
      0;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dispatchSwipe({ type: 'DRAG_START' });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>): void {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    // Let vertical scroll win when it clearly dominates
    if (!hasDraggedRef.current && Math.abs(dy) > Math.abs(dx)) {
      isDraggingRef.current = false;
      dispatchSwipe({ type: 'DRAG_CANCEL_VERTICAL', offset: baseOffsetRef.current });
      return;
    }
    if (Math.abs(dx) < DRAG_THRESHOLD) return;
    hasDraggedRef.current = true;
    dispatchSwipe({
      type: 'DRAG_MOVE',
      offset: Math.max(-REVEAL_WIDTH, Math.min(REVEAL_WIDTH, baseOffsetRef.current + dx)),
    });
  }

  function handlePointerUp(): void {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const dx = offset - baseOffsetRef.current;

    if (revealedSide === 'delete') {
      // delete 已開：右滑超過 threshold → 關閉（不跳到 archive）
      if (dx > SNAP_THRESHOLD) dispatchSwipe({ type: 'SNAP_CLOSE' });
      else                     dispatchSwipe({ type: 'KEEP_CURRENT', revealedSide: 'delete' });
    } else if (revealedSide === 'archive') {
      // archive 已開：左滑超過 threshold → 關閉（不跳到 delete）
      if (dx < -SNAP_THRESHOLD) dispatchSwipe({ type: 'SNAP_CLOSE' });
      else                      dispatchSwipe({ type: 'KEEP_CURRENT', revealedSide: 'archive' });
    } else {
      // 中立：依方向決定開哪個
      if      (dx < -SNAP_THRESHOLD) dispatchSwipe({ type: 'SNAP_OPEN_DELETE' });
      else if (dx >  SNAP_THRESHOLD) dispatchSwipe({ type: 'SNAP_OPEN_ARCHIVE' });
      else                           dispatchSwipe({ type: 'KEEP_CURRENT', revealedSide: null });
    }
  }

  function handleClick(): void {
    if (reorderMode) return;
    if (hasDraggedRef.current) return;
    if (revealedSide !== null) {
      dispatchSwipe({ type: 'CLOSE_REVEAL' });
    } else if (onCardClick) {
      onCardClick(project);
    } else {
      setNoteSheetOpen(true);
    }
  }

  return (
    <>
      {/* Outer wrapper: relative, no overflow-hidden — lets 3-dot dropdown escape */}
      <div ref={containerRef} className="relative rounded-xl">

        {/* Archive zone — absolutely positioned OUTSIDE overflow-hidden, revealed on right-swipe */}
        <div
          className="absolute left-0 top-0.25 bottom-0.25 flex items-center justify-center rounded-l-xl overflow-hidden"
          style={{ width: REVEAL_WIDTH, zIndex: revealedSide === 'archive' ? 2 : 0 }}
        >
          <button
            className={`h-full w-full flex items-center justify-center text-white text-sm font-medium ${project.isArchived ? 'bg-primary' : 'bg-success'}`}
            onClick={() => {
              if (project.isArchived) onUnarchive(project.id);
              else onArchive(project.id);
              dispatchSwipe({ type: 'CLOSE_REVEAL' });
            }}
          >
            {project.isArchived ? 'Unarchive' : 'Archive'}
          </button>
        </div>

        {/* Inner wrapper: overflow-hidden clips the sliding row; z-[1] covers archive zone */}
        <div className="overflow-hidden rounded-xl" style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              transform: `translateX(${offset}px)`,
              transition: isDragging ? 'none' : 'transform 200ms ease-out',
            }}
          >
            {/* Card body */}
            <div
              data-testid="card-body"
              className="bg-surface-variant shadow-sm w-full shrink-0 flex flex-col"
              style={{
                borderLeft: `4px solid ${colorHex}`,
                touchAction: 'pan-y',
                cursor: 'pointer',
                userSelect: 'none',
              }}
              {...(!reorderMode && {
                onPointerDown: handlePointerDown,
                onPointerMove: handlePointerMove,
                onPointerUp: handlePointerUp,
                onPointerCancel: handlePointerUp,
              })}
              onClick={handleClick}
            >
              {/* Main content row */}
              <div className="flex-1 overflow-hidden flex items-center gap-3 px-5 pt-3 pb-2 h-[88px]">
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'font-display text-base font-bold leading-tight truncate',
                      project.isArchived ? 'text-on-surface-variant' : 'text-on-surface',
                    )}
                  >
                    {project.name}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 min-w-0">
                    {project.isArchived && (
                      <span className="text-xs text-on-surface-variant shrink-0">Archived</span>
                    )}
                    {/* Note inline after badge — truncates if too long */}
                    <p className="text-xs text-on-surface-variant truncate leading-tight min-w-0">
                      {project.notes}
                    </p>
                  </div>
                </div>

                {/* Play button */}
                <button
                  data-testid="play-button"
                  aria-label="Start session"
                  disabled={reorderMode}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation();
                    if (!reorderMode) onStart(project);
                  }}
                  className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-primary-container text-on-primary-container transition-opacity duration-100 disabled:opacity-30"
                >
                  ▶
                </button>

                {/* Edit button */}
                <button
                  data-testid="edit-button"
                  aria-label="Edit project"
                  disabled={reorderMode}
                  onPointerDown={e => e.stopPropagation()}
                  onClick={e => {
                    e.stopPropagation();
                    if (!reorderMode) onEdit(project);
                  }}
                  className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center bg-surface-variant text-on-surface-variant border border-outline/40 transition-opacity duration-100 disabled:opacity-30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>

              {/* Progress bar */}
              <ProjectProgressBar
                totalMinutes={totalMinutes}
                estimatedDurationMinutes={project.estimatedDurationMinutes}
                colorHex={colorHex}
                className="pb-3"
              />
            </div>

            {/* Delete zone — revealed on swipe left; reuses existing PixelDialog */}
            <div
              className="bg-error shrink-0 flex items-center justify-center"
              style={{ width: REVEAL_WIDTH }}
            >
              <button
                className="h-full w-full flex items-center justify-center text-white text-sm font-medium"
                onClick={() => setDeleteDialogOpen(true)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Fixed-position overlays — omitted in reorderMode to avoid transform stacking context issues */}
      {!reorderMode && (
        <>
          <PixelDialog
            isOpen={deleteDialogOpen}
            message={`Delete "${project.name}"?\nYour session history will be kept.`}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteDialogOpen(false)}
            confirmLabel="YES"
            cancelLabel="NO"
            isDanger
            className="max-w-sm mx-auto"
          />

          {/* Only render the sheet when no external onCardClick handler is provided */}
          {!onCardClick && (
            <ProjectDetailSheet
              project={noteSheetOpen ? project : null}
              onClose={() => setNoteSheetOpen(false)}
            />
          )}
        </>
      )}
    </>
  );
}
