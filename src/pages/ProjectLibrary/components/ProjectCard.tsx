import { useState } from 'react';
import { ColorDot } from '@/components/shared/ColorDot';
import { DurationBadge } from '@/components/shared/DurationBadge';
import { PixelDialog } from '@/components/shared/PixelDialog';
import { BottomSheet } from '@/components/shared/BottomSheet';
import { useSessionStore } from '@/store/sessionStore';
import { COLOR_HEX_MAP } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Project } from '@/types';

interface ProjectCardProps {
  readonly project: Project;
  readonly onStart: (project: Project) => void;
  readonly onEdit: (project: Project) => void;
  readonly onArchive: (id: string) => void;
  readonly onUnarchive: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

export function ProjectCard({
  project,
  onStart,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: ProjectCardProps): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteSheetOpen, setNoteSheetOpen] = useState(false);

  const sessions = useSessionStore(s => s.sessions);

  const sessionNotes = sessions
    .filter(s => s.projectId === project.id && s.notes.trim() !== '')
    .sort((a, b) => b.startedAt - a.startedAt);

  function handleMenuAction(action: 'edit' | 'archive' | 'unarchive' | 'delete' | 'note'): void {
    setMenuOpen(false);
    if (action === 'edit') onEdit(project);
    else if (action === 'archive') onArchive(project.id);
    else if (action === 'unarchive') onUnarchive(project.id);
    else if (action === 'delete') setDeleteDialogOpen(true);
    else if (action === 'note') setNoteSheetOpen(true);
  }

  function handleConfirmDelete(): void {
    setDeleteDialogOpen(false);
    onDelete(project.id);
  }

  return (
    <>
      {/* Fixed-height card — all cards same height regardless of notes */}
      <div
        className="relative flex rounded-lg bg-surface-variant shadow-sm h-24"
        style={{ borderLeft: `4px solid ${COLOR_HEX_MAP[project.color]}` }}
      >
        {/* Card info — tap to start; overflow-hidden here clips content but NOT the popup menu */}
        <button
          onClick={() => onStart(project)}
          className="flex flex-1 items-center gap-3 px-5 py-3 text-left overflow-hidden"
        >
          <ColorDot color={project.color} size={14} className="shrink-0" />
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
              <DurationBadge minutes={project.estimatedDurationMinutes} />
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
          <span className="shrink-0 rounded-lg bg-primary-container text-on-primary-container px-4 py-2 text-sm font-medium active:opacity-80 transition-opacity duration-100">
            ▶
          </span>
        </button>

        {/* 3-dot menu button */}
        <div className="relative flex shrink-0 border-l border-outline/30">
          <button
            onClick={e => {
              e.stopPropagation();
              setMenuOpen(v => !v);
            }}
            className="flex h-full w-14 items-center justify-center text-on-surface-variant"
            aria-label="More options"
          >
            ···
          </button>

          {/* Popup menu */}
          {menuOpen && (
            <>
              <div
                className="fixed inset-0"
                style={{ zIndex: 10 }}
                onClick={() => setMenuOpen(false)}
                aria-hidden
              />
              <div
                className="absolute right-0 top-full bg-surface rounded-lg shadow-lg border border-outline/20 z-20 min-w-[160px]"
                style={{ zIndex: 20 }}
              >
                <button
                  onClick={() => handleMenuAction('note')}
                  className="flex w-full items-center gap-2 px-4 py-[14px] text-sm text-on-surface hover:bg-surface-variant"
                >
                  ✎ Note
                </button>
                <button
                  onClick={() => handleMenuAction('edit')}
                  className="flex w-full items-center gap-2 px-4 py-[14px] text-sm text-on-surface hover:bg-surface-variant"
                >
                  ✎ Edit
                </button>
                {project.isArchived ? (
                  <button
                    onClick={() => handleMenuAction('unarchive')}
                    className="flex w-full items-center gap-2 px-4 py-[14px] text-sm text-on-surface hover:bg-surface-variant"
                  >
                    ⊳ Unarchive
                  </button>
                ) : (
                  <button
                    onClick={() => handleMenuAction('archive')}
                    className="flex w-full items-center gap-2 px-4 py-[14px] text-sm text-on-surface hover:bg-surface-variant"
                  >
                    ⊳ Archive
                  </button>
                )}
                <button
                  onClick={() => handleMenuAction('delete')}
                  className="flex w-full items-center gap-2 px-4 py-[14px] text-sm text-error hover:bg-surface-variant"
                >
                  ✕ Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <PixelDialog
        isOpen={deleteDialogOpen}
        message={`Delete "${project.name}"?\nYour session history will be kept.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteDialogOpen(false)}
        confirmLabel="YES"
        cancelLabel="NO"
        isDanger
      />

      {/* Note sheet */}
      <BottomSheet
        isOpen={noteSheetOpen}
        onClose={() => setNoteSheetOpen(false)}
        title="Notes"
        height="70dvh"
      >
        {/* Only mount content when open to prevent duplicate text in DOM */}
        {noteSheetOpen && <div className="flex flex-col gap-5 p-4">
          {/* Project note */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <ColorDot color={project.color} size={10} />
              <p className="text-sm font-medium text-on-surface">{project.name}</p>
            </div>
            {project.notes ? (
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {project.notes}
              </p>
            ) : (
              <p className="text-sm text-on-surface-variant/50 italic">No project notes.</p>
            )}
          </div>

          {/* Session notes */}
          {sessionNotes.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
                Session notes
              </p>
              {sessionNotes.map(s => (
                <div key={s.id} className="flex flex-col gap-1 border-b border-outline/20 pb-3 last:border-0 last:pb-0">
                  <p className="text-xs text-on-surface-variant">
                    {new Date(s.startedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                  <p className="text-sm text-on-surface leading-relaxed">{s.notes}</p>
                </div>
              ))}
            </div>
          )}

          {sessionNotes.length === 0 && !project.notes && (
            <p className="text-sm text-on-surface-variant/50 italic text-center py-4">
              No notes yet.
            </p>
          )}
        </div>}
      </BottomSheet>
    </>
  );
}
